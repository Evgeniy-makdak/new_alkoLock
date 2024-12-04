import { useEffect, useMemo, useState } from 'react';

import type { ChipProps } from '@mui/material';
import type { GridRowsProp } from '@mui/x-data-grid';

import { EventType, type IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import { SearchMethods } from '@shared/utils/global_methods';

import { ValuesHeader } from './getColumns';

export interface Row {
  id: string;
  idDevice: number;
  lastEvent: { eventType?: string };
  finishedAt: string;
  status: string;
  DATE: string;
  SERIAL_NUMBER: string | number;
  TC: string;
  INITIATOR: string;
  STATE: string;
  PROCESS: string;
}

export const chipColor: { [key: string]: ChipProps['color'] } = {
  'Ожидание водителя': 'warning',
  'Ожидание оператора': 'warning',
  'Оператор отклонил': 'error',
  'Водитель отклонил': 'secondary',
  'Офлайн-переключение': 'secondary',
  'Водитель подтвердил': 'success',
  'Оператор подтвердил': 'success',
};

const getStatus = (item: IDeviceAction) => {
  const lastEvent = SearchMethods.findMostRecentEvent(item.events);
  const requestType = SearchMethods.findFirstRequestEvent(item.events)?.eventType;

  const isAcknowledged = !!(item.events ?? []).find(
    (event) => event.eventType === EventType.APP_ACKNOWLEDGED,
  );
  let status;

  if (lastEvent?.eventType === EventType.SERVER_REQUEST) {
    status = 'Ожидание водителя';
  } else if (lastEvent?.eventType === EventType.APP_REQUEST) {
    status = 'Ожидание оператора';
  } else if (lastEvent?.eventType === EventType.REJECTED) {
    if (isAcknowledged) {
      status = 'Оператор отклонил';
    } else if (requestType === EventType.SERVER_REQUEST) {
      status = 'Водитель отклонил';
    } else {
      status = 'Оператор отклонил';
    }
  } else if (lastEvent?.eventType === EventType.ACCEPTED) {
    if (isAcknowledged) {
      status = 'Оператор подтвердил';
    } else if (requestType === EventType.SERVER_REQUEST) {
      status = 'Водитель подтвердил';
    } else {
      status = 'Оператор подтвердил';
    }
  } else if (
    lastEvent?.eventType === EventType.OFFLINE_DEACTIVATION ||
    lastEvent?.eventType === EventType.OFFLINE_ACTIVATION
  ) {
    status = 'Офлайн-переключение';
  } else {
    status = '-';
  }

  return { lastEvent, status };
};

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  // Локальное состояние для данных
  const [filteredData, setFilteredData] = useState<IDeviceAction[]>([]);

  useEffect(() => {
    // Убираем строки с seen: true из данных
    const updatedData = (Array.isArray(data) ? data : []).filter((item) => !item.seen);
    setFilteredData(updatedData);
  }, [data]);

  const rows = useMemo(() => {
    return filteredData.map((item) => {
      const { lastEvent, status } = getStatus(item);
      let process;

      if (item.type === 'SERVICE_MODE_ACTIVATE') {
        process = 'Включение';
      } else if (item.type === 'SERVICE_MODE_DEACTIVATE') {
        process = 'Выключение';
      } else {
        process = '-';
      }

      return {
        id: item.id,
        idDevice: item?.device?.id,
        lastEvent: lastEvent,
        finishedAt: item.occurredAt,
        state: status,
        [ValuesHeader.DATE]: Formatters.formatISODate(item.createdAt) ?? '-',
        [ValuesHeader.SERIAL_NUMBER]: item.device?.serialNumber ?? '-',
        [ValuesHeader.TC]: item.vehicleRecord ? Formatters.carNameFormatter(item.vehicleRecord) : '-',
        [ValuesHeader.INITIATOR]: Formatters.nameFormatter(item.userAction),
        [ValuesHeader.STATE]: status,
        [ValuesHeader.PROCESS]: process,
      };
    });
  }, [filteredData]);

  return rows;
};
