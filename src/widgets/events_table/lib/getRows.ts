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

      // Используйте данные из массива events
      const event = item.events && item.events.length > 0 ? item.events[0] : null;

      return {
        id: item.id,
        [ValuesHeader.DATE_OCCURRENT]: event ? Formatters.formatISODate(event.occurredAt) ?? '-' : '-', 
        [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.createdBy) ?? '-',
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
