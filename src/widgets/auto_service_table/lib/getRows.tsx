import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChipProps } from '@mui/material';
import type { GridRowsProp } from '@mui/x-data-grid';

import { SettingsApi } from '@shared/api/settingsApi';
import { EventType, type IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import { SearchMethods } from '@shared/utils/global_methods';
import { useCountContext } from '@widgets/nav_bar/api/CountContext';

import { ValuesHeader } from './getColumns';

export interface Row {
  id: string;
  idDevice: number;
  lastEvent: { eventType?: string };
  finishedAt: string;
  finishedAtRaw?: string | null;
  createdAtRaw?: string | null;
  status: string;
  DATE: string;
  SERIAL_NUMBER: string | number;
  TC: string;
  INITIATOR: string;
  STATE: string;
  PROCESS: string;
  stateKey: ServiceModeStatusKey;
}

export type ServiceModeStatusKey =
  | 'driverWaiting'
  | 'operatorWaiting'
  | 'operatorRejected'
  | 'driverRejected'
  | 'offlineSwitch'
  | 'driverConfirmed'
  | 'operatorConfirmed'
  | 'unknown';

export const chipColor: { [key in ServiceModeStatusKey]?: ChipProps['color'] } = {
  driverWaiting: 'warning',
  operatorWaiting: 'warning',
  operatorRejected: 'error',
  driverRejected: 'secondary',
  offlineSwitch: 'secondary',
  driverConfirmed: 'success',
  operatorConfirmed: 'success',
};

const getStatus = (item: IDeviceAction) => {
  const lastEvent = item.events.reduce((latest, current) => {
    return new Date(latest.timestamp) > new Date(current.timestamp) ? latest : current;
  }, item.events[0]);
  const requestType = SearchMethods.findFirstRequestEvent(item.events)?.eventType;

  const isAcknowledged = !!(item.events ?? []).find(
    (event) => event.eventType === EventType.ACCEPTED,
  );

  const hasAcceptedEvent = (item.events ?? []).some(
    (event) => event.eventType === EventType.ACCEPTED,
  );

  let status: ServiceModeStatusKey;

  if (lastEvent?.eventType === EventType.SERVER_REQUEST) {
    status = 'driverWaiting';
  } else if (lastEvent?.eventType === EventType.APP_REQUEST) {
    status = 'operatorWaiting';
  } else if (lastEvent?.eventType === EventType.REJECTED) {
    if (isAcknowledged) {
      status = 'operatorRejected';
    } else if (requestType === EventType.SERVER_REQUEST) {
      status = 'driverRejected';
    } else {
      status = 'operatorRejected';
    }
  } else if (hasAcceptedEvent) {
    if (isAcknowledged) {
      status = 'driverConfirmed';
    } else if (requestType === EventType.SERVER_REQUEST) {
      status = 'driverConfirmed';
    } else {
      status = 'operatorConfirmed';
    }
  } else if (
    lastEvent?.eventType === EventType.OFFLINE_DEACTIVATION ||
    lastEvent?.eventType === EventType.OFFLINE_ACTIVATION
  ) {
    status = 'offlineSwitch';
  } else {
    status = 'unknown';
  }

  return { lastEvent, status };
};

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const { t } = useTranslation();
  const [filteredData, setFilteredData] = useState<IDeviceAction[]>([]);
  const [autoHideTimeout, setAutoHideTimeout] = useState<number | null>(null);
  const { length } = useCountContext();

  useEffect(() => {
    const loadAutoHideSettings = async () => {
      try {
        const settings = await SettingsApi.getSettingsById(1);
        // Используем currentValue, если есть, иначе берем defaultValue из ответа сервера
        const timeoutMinutes = settings?.currentValue ?? settings?.defaultValue;
        setAutoHideTimeout(timeoutMinutes * 60 * 1000); // Конвертируем минуты в миллисекунды
      } catch (error) {
        console.error('Ошибка при загрузке настроек автоскрытия:', error);
        // Если ошибка, попробуем получить defaultValue через повторный запрос
        try {
          const settings = await SettingsApi.getSettingsById(1);
          setAutoHideTimeout(settings.defaultValue * 60 * 1000);
        } catch (fallbackError) {
          console.error('Не удалось получить defaultValue:', fallbackError);
          // В крайнем случае можно использовать 10 минут как последнее средство
          setAutoHideTimeout(10 * 60 * 1000);
        }
      }
    };

    loadAutoHideSettings();
  }, []);

  useEffect(() => {
    // Убираем строки с seen: true из данных
    const updatedData = (Array.isArray(data) ? data : []).filter((item) => !item.seen);
    setFilteredData(updatedData);
  }, [data, length]);

  useEffect(() => {
    if (autoHideTimeout === null) return; // Не запускаем таймеры, пока не загружены настройки

    const timerIds: NodeJS.Timeout[] = [];
    const idsToRemoveImmediately = new Set<string | number>();

    // Проверяем и скрываем обработанные строки через указанное время
    filteredData.forEach((item) => {
      const { status } = getStatus(item);
      if (status === 'driverConfirmed' || status === 'operatorConfirmed') {
        const remainingTime = autoHideTimeout - (Date.now() - new Date(item.finishedAt).getTime());

        if (remainingTime > 0) {
          const timerId = setTimeout(() => {
            setFilteredData((prevData) => prevData.filter((row) => row.id !== item.id));
          }, remainingTime);
          timerIds.push(timerId);
        } else {
          idsToRemoveImmediately.add(item.id);
        }
      }
    });

    if (idsToRemoveImmediately.size > 0) {
      setFilteredData((prev) => prev.filter((row) => !idsToRemoveImmediately.has(row.id)));
    }

    return () => {
      timerIds.forEach((id) => clearTimeout(id));
    };
  }, [filteredData, autoHideTimeout]);

  const rows = useMemo(() => {
    const isValidDate = (value: unknown) => {
      if (!value) return false;
      const d = new Date(value as string | number | Date);
      return !isNaN(d.getTime());
    };
    return filteredData.map((item) => {
      const { lastEvent, status } = getStatus(item);
      let process: string;
      let statusLabel: string;

      switch (status) {
        case 'driverWaiting':
          statusLabel = t('serviceMode.status.driverWaiting');
          break;
        case 'operatorWaiting':
          statusLabel = t('serviceMode.status.operatorWaiting');
          break;
        case 'operatorRejected':
          statusLabel = t('serviceMode.status.operatorRejected');
          break;
        case 'driverRejected':
          statusLabel = t('serviceMode.status.driverRejected');
          break;
        case 'offlineSwitch':
          statusLabel = t('serviceMode.status.offlineSwitch');
          break;
        case 'driverConfirmed':
          statusLabel = t('serviceMode.status.driverConfirmed');
          break;
        case 'operatorConfirmed':
          statusLabel = t('serviceMode.status.operatorConfirmed');
          break;
        default:
          statusLabel = '-';
      }

      if (item.type === 'SERVICE_MODE_ACTIVATE') {
        process = t('serviceMode.process.activate');
      } else if (item.type === 'SERVICE_MODE_DEACTIVATE') {
        process = t('serviceMode.process.deactivate');
      } else {
        process = '-';
      }

      return {
        id: item.id,
        idDevice: item?.device?.id,
        lastEvent: lastEvent,
        finishedAt: item.occurredAt,
        finishedAtRaw: isValidDate(item.finishedAt) ? String(item.finishedAt) : null,
        createdAtRaw: isValidDate(item.createdAt) ? String(item.createdAt) : null,
        state: statusLabel,
        stateKey: status,
        [ValuesHeader.DATE]: isValidDate(item.createdAt) ? Formatters.formatISODate(item.createdAt) : '-',
        [ValuesHeader.SERIAL_NUMBER]: item.device?.serialNumber ?? '-',
        [ValuesHeader.TC]: item.vehicleRecord
          ? Formatters.carNameFormatter(item.vehicleRecord)
          : '-',
        [ValuesHeader.INITIATOR]: Formatters.nameFormatter(item.userAction),
        [ValuesHeader.STATE]: statusLabel,
        [ValuesHeader.PROCESS]: process,
      };
    });
  }, [filteredData, t]);

  return rows;
};
