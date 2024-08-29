import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { type ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: ICar[]): GridRowsProp => {
  const mapData = (Array.isArray(data) ? data : []).map((item) => {
    return {
      id: item.id,
      name: Formatters.carNameFormatter(item),
      [ValuesHeader.MARK]: item.manufacturer ?? '-',
      [ValuesHeader.MODEL]: item.model ?? '-',
      [ValuesHeader.VIN]: item.vin ?? '-',
      [ValuesHeader.GOS_NUMBER]: item.registrationNumber ?? '-',
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
