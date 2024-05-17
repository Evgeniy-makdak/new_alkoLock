import type { FC } from 'react';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { MapLink } from '@shared/ui/map_link';
import { Formatters } from '@shared/utils/formatters';

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
};

export const EventData: FC<EventData> = ({ event, type, testid }) => {
  const hasMapLink =
    !!(event?.events ?? [])[0] && !!event?.events[0].latitude && !!event?.events[0].longitude;

  return (
    <div className={style.td}>
      {type !== HistoryTypes.byUser && (
        <>
          <div className={style.row}>
            <span>Водитель</span>

            <span>{Formatters.nameFormatter((event?.events ?? [])[0]?.userRecord)}</span>
          </div>
          <div className={style.row}>
            <span>Почта</span>

            <span>{(event?.events ?? [])[0]?.userRecord?.email}</span>
          </div>
        </>
      )}

      {type === HistoryTypes.byCar && (
        <>
          <div className={style.row}>
            <span>Наименование алкозамка</span>

            <span>{event?.device?.name ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>Серийный номер алкозамка</span>

            <span>{event?.device?.serialNumber ?? '-'}</span>
          </div>
        </>
      )}

      {type !== HistoryTypes.byCar && (
        <>
          <div className={style.row}>
            <span>Марка ТС</span>

            <span>{event?.vehicleRecord?.manufacturer ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>Модель ТС</span>

            <span>{event?.vehicleRecord?.model ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>Государственный номер</span>

            <span>{event?.vehicleRecord?.registrationNumber ?? '-'}</span>
          </div>
        </>
      )}

      {event?.action?.type === 'SOBRIETY_TEST' && type !== HistoryTypes.byAlcolock && (
        <div className={style.row}>
          <span>Результат тестирования</span>

          <span>{event.summary?.testResult ?? '-'} мг/л</span>
        </div>
      )}

      <div className={style.row}>
        <span>Координаты</span>

        <span>
          {hasMapLink ? (
            <MapLink
              testid={testid}
              latitude={event.events[0].latitude}
              longitude={event.events[0].longitude}
            />
          ) : (
            '-'
          )}
        </span>
      </div>
    </div>
  );
};
