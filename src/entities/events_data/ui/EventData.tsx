/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { EventsApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import type { ID, IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';
import { EventInfo } from '@widgets/events_info';

import style from './EventData.module.scss';

export enum HistoryTypes {
  byUser = 'byUser',
  byCar = 'byCar',
  byAlcolock = 'byAlcolock',
}

type EventData = {
  type: HistoryTypes;
  testid: string;
  event: IDeviceAction;
  showDetailsLink?: boolean;
  openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void;
  expandedRowId?: ID | null;
  onExpandRow?: (id: ID | null) => void;
  freezeMarkers?: boolean;
  onToggleFreezeMarkers?: (checked: boolean) => void;
  /** При вызове — перемещает карту к координатам (для вкладки Карта) */
  onCoordinateClick?: (lat: number, lng: number, vehicle: string) => void;
};

export const EventData: FC<EventData> = ({
  event,
  type,
  testid,
  showDetailsLink,
  openDetailsPanel,
  onExpandRow,
  freezeMarkers = false,
  onToggleFreezeMarkers,
  onCoordinateClick,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Координаты могут быть в summary, events[0] или на верхнем уровне (разная структура API)
  const latitude = event?.summary?.lat ?? event?.events?.[0]?.latitude ?? (event as any)?.latitude;
  const longitude =
    event?.summary?.lon ?? event?.events?.[0]?.longitude ?? (event as any)?.longitude;
  const hasCoordinates = !!latitude && !!longitude;
  const isTestEvent =
    event?.eventType === 'Тестирование пройдено' || event?.eventType === 'Тестирование не пройдено';

  const handleDetailsClick = async () => {
    try {
      await EventsApi.getEventItem(event?.actionId);
      openDetailsPanel?.({
        id: event?.actionId,
        content: <EventInfo selectedEventId={event?.actionId} />,
      });
    } catch (error) {
      // console.error('Ошибка при загрузке данных события:', error);
    }
  };

  const handleMapClick = () => {
    if (!hasCoordinates) return;

    const registrationNumber =
      event?.action?.vehicleRecord?.registrationNumber ??
      event?.vehicleRecord?.registrationNumber ??
      (event as any)?.vehicle?.registrationNumber;
    if (!registrationNumber) return;

    // Если режим "Закрепить маркеры" выключен - включаем его
    if (!freezeMarkers && onToggleFreezeMarkers) {
      onToggleFreezeMarkers(true);
    }

    if (onCoordinateClick) {
      onCoordinateClick(Number(latitude), Number(longitude), registrationNumber);
    } else {
      navigate({
        pathname: RoutePaths.map,
        search: `?lat=${latitude}&lng=${longitude}&vehicle=${encodeURIComponent(registrationNumber)}`,
      });
    }
    onExpandRow?.(event.id);
  };

  return (
    <div className={style.td}>
      {type !== HistoryTypes.byUser && (
        <>
          <div className={style.row}>
            <span>{t('map.eventDetails.driver')}</span>
            <span>{Formatters.nameFormatter(event?.userRecord)}</span>
          </div>
          <div className={style.row}>
            <span>{t('map.eventDetails.email')}</span>
            <span>{event?.userRecord?.email}</span>
          </div>
        </>
      )}

      <div className={style.row}>
        <span>{t('map.eventDetails.deviceName')}</span>
        <span>{event?.deviceRecord?.name ?? '-'}</span>
      </div>
      <div className={style.row}>
        <span>{t('map.eventDetails.deviceSerial')}</span>
        <span>{event?.deviceRecord?.serialNumber ?? '-'}</span>
      </div>

      {type !== HistoryTypes.byCar && (
        <>
          <div className={style.row}>
            <span>{t('map.eventDetails.vehicleMake')}</span>
            <span>{event?.vehicleRecord?.manufacturer ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>{t('map.eventDetails.vehicleModel')}</span>
            <span>{event?.vehicleRecord?.model ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>{t('map.eventDetails.stateNumber')}</span>
            <span>{event?.vehicleRecord?.registrationNumber ?? '-'}</span>
          </div>
        </>
      )}

      {isTestEvent && (
        <div className={style.row}>
          {/* <span>Количественный результат</span>
          <span>{event?.extra?.testResult ?? '-'} мг/л</span> */}
        </div>
      )}

      {event?.action?.vehicleRecord?.type === 'SOBRIETY_TEST' &&
        type !== HistoryTypes.byAlcolock && (
          <div className={style.row}>
            <span>{t('map.eventDetails.testResult')}</span>
            <span>{event.summary?.testResult ?? '-'} мг/л</span>
          </div>
        )}

      <div className={style.row}>
        <span>{t('map.eventDetails.coordinates')}</span>
        <span>
          {hasCoordinates ? (
            <button
              className={`${style.mapLink} ${freezeMarkers ? style.active : ''}`}
              onClick={handleMapClick}
              data-testid={testid}>
              {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}
            </button>
          ) : (
            '-'
          )}
        </span>
      </div>

      {showDetailsLink && (
        <div className={style['details-row']}>
          <button className={style['details-button']} onClick={handleDetailsClick}>
            {t('map.eventDetails.more')}
          </button>
        </div>
      )}
    </div>
  );
};
