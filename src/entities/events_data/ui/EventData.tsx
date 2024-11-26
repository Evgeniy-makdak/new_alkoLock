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
    !!event?.latitude && !!event?.longitude;

  return (
    <div className={style.td}>
      {type !== HistoryTypes.byUser && (
        <>
          <div className={style.row}>
            <span>Водитель</span>

            <span>{Formatters.nameFormatter(event?.userRecord)}</span>
          </div>
          <div className={style.row}>
            <span>Почта</span>

            <span>{event?.userRecord?.email}</span>
          </div>
        </>
      )}

      {type === HistoryTypes.byCar && (
        <>
          <div className={style.row}>
            <span>Наименование алкозамка</span>

            <span>{event?.action.device?.name ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>Серийный номер алкозамка</span>

            <span>{event?.action.device?.serialNumber ?? '-'}</span>
          </div>
        </>
      )}

      {type !== HistoryTypes.byCar && (
        <>
          <div className={style.row}>
            <span>Марка ТС</span>

            <span>{event?.action?.vehicleRecord?.manufacturer ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>Модель ТС</span>

            <span>{event?.action?.vehicleRecord?.model ?? '-'}</span>
          </div>
          <div className={style.row}>
            <span>Государственный номер</span>

            <span>{event?.action?.vehicleRecord?.registrationNumber ?? '-'}</span>
          </div>
        </>
      )}

      {event?.action?.vehicleRecord?.type === 'SOBRIETY_TEST' && type !== HistoryTypes.byAlcolock && (
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
              latitude={event.latitude}
              longitude={event.longitude}
            />
          ) : (
            '-'
          )}
        </span>
      </div>
    </div>
  );
};
