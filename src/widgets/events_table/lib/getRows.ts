import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { getLastEvent } from '@entities/type_event_select';
import { type IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const mapData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => {
      const lastEvent = getLastEvent(item);

      // Проверяем, что occuredAt - строка
      const occuredAt =
        typeof item.occuredAt === 'string' ? item.occuredAt : undefined;

      return {
        id: item.id,
        [ValuesHeader.DATE_OCCURRENT]: occuredAt
          ? Formatters.formatISODate(occuredAt) ?? '-'
          : '-',
        [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.userActionId) ?? '-',
        [ValuesHeader.TC]: item.vehicleRecord
          ? Formatters.carNameFormatter(item.vehicleRecord, true)
          : '-',
        [ValuesHeader.GOS_NUMBER]: item.vehicleRecord?.registrationNumber ?? '-',
        [ValuesHeader.TYPE_OF_EVENT]: lastEvent,
      };
    });
  }, [data]);

  return mapData;
};
