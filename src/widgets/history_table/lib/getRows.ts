import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const mapData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => {
      // const timestamp = typeof item.timestamp === 'string' ? item.timestamp : undefined;
      const typeOfEvent: string = item.eventType;

      return {
        id: item.id,
        [ValuesHeader.CREATED_AT]: item.createdAt
          ? Formatters.formatISODate(item.createdAt) ?? '-'
          : '-',
        [ValuesHeader.INITIATOR]: Formatters.nameFormatter(item.initiator) ?? '-',
        [ValuesHeader.HANDLER]: Formatters.nameFormatter(item.handler) ?? '-',
        [ValuesHeader.TC]: item?.vehicle.model
          ? Formatters.carNameFormatter(item?.vehicle, false)
          : '-',
        [ValuesHeader.ALCOLOKS]: Formatters.alcolocksFormatter(item.device) ?? '-',
        [ValuesHeader.TYPE_OF_EVENT]: typeOfEvent,
      };
    });
  }, [data]);

  return mapData;
};
