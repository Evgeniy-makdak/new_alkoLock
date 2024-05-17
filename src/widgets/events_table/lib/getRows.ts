import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { getLastEvent } from '@entities/type_event_select';
import { type IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const mapData = (Array.isArray(data) ? data : []).map((item) => {
    const lastEvent = getLastEvent(item);

    return {
      id: item.id,
      [ValuesHeader.DATE_OCCURRENT]: Formatters.formatISODate(item.startedAt) ?? '-',
      [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.createdBy) ?? '-',
      [ValuesHeader.TC]: item.vehicleRecord
        ? Formatters.carNameFormatter(item.vehicleRecord, true)
        : '-',
      [ValuesHeader.GOS_NUMBER]: item.vehicleRecord?.registrationNumber ?? '-',
      [ValuesHeader.TYPE_OF_EVENT]: lastEvent,
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
