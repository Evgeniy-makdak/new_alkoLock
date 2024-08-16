import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const mapData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => {
      const occurredAt = typeof item.occurredAt === 'string' ? item.occurredAt : undefined;
      const typeOfEvent: string = item.events[3]?.eventType ?? item.events[0].eventType;

      const formattedTypeOfEvent =
        typeOfEvent === 'Тестирование пройдено' ||
        typeOfEvent === 'Ошибка при тестировании' ||
        typeOfEvent === 'Сканирование QR кода'
          ? 'Тестирование'
          : typeOfEvent;

      return {
        id: item.id,
        [ValuesHeader.DATE_OCCURRENT]: occurredAt
          ? Formatters.formatISODate(occurredAt) ?? '-'
          : '-',
        [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.userActionId) ?? '-',
        [ValuesHeader.TC]: item.vehicleRecord
          ? Formatters.carNameFormatter(item.vehicleRecord, true)
          : '-',
        [ValuesHeader.GOS_NUMBER]: item.vehicleRecord?.registrationNumber ?? '-',
        [ValuesHeader.TYPE_OF_EVENT]: formattedTypeOfEvent,
      };
    });
  }, [data]);

  return mapData;
};
