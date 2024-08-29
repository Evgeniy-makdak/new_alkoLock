import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { type IAlcolock } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IAlcolock[]): GridRowsProp => {
  const mapData = (Array.isArray(data) ? data : []).map((item) => {
    return {
      id: item.id,
      name: item?.name ?? '-',
      [ValuesHeader.NAMING]: item?.name ?? '-',
      [ValuesHeader.SERIAL_NUMBER]: item?.serialNumber ?? '-',
      [ValuesHeader.TC]: Formatters.carNameFormatter(item.vehicleBind?.vehicle),
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
