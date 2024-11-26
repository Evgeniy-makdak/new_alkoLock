import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const mapData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => {
      const timestamp = typeof item.timestamp === 'string' ? item.timestamp : undefined;
      const typeOfEvent: string = item.eventType;

      return {
        id: item.id,
        actionId: item?.action.id,
        [ValuesHeader.DATE_OCCURRENT]: timestamp
          ? Formatters.formatISODate(timestamp) ?? '-'
          : '-',
        [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.userRecord) ?? '-',
        [ValuesHeader.TC]: item.action.vehicleRecord
          ? Formatters.carNameFormatter(item.action.vehicleRecord, true)
          : '-',
        [ValuesHeader.GOS_NUMBER]: item.action.vehicleRecord?.registrationNumber ?? '-',
        [ValuesHeader.TYPE_OF_EVENT]: typeOfEvent,
      };
    });
  }, [data]);

  return mapData;
};
