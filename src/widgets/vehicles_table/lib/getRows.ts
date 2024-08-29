import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { type ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (car: ICar[]): GridRowsProp => {
  const mapData = (car ? car : []).map((item) => {
    return {
      id: item.id,
      [ValuesHeader.MARK]: item?.manufacturer ?? '-',
      [ValuesHeader.MODEL]: item?.model ?? '-',
      [ValuesHeader.VIN]: item?.vin,
      [ValuesHeader.GOS_NUMBER]: item?.registrationNumber,
      [ValuesHeader.YEAR]: item?.year,
      [ValuesHeader.DATE_CREATE]: Formatters.formatISODate(item?.createdAt),
    };
  });

  const returnData = useMemo(() => mapData, [car]);
  return returnData;
};
