import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { type IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IUser[]): GridRowsProp => {
  const mapData = (Array.isArray(data) ? data : []).map((item) => {
    const cars = item?.driver?.vehicleAllotments?.map((vehicleAllotment) => {
      return Formatters.carNameFormatter(vehicleAllotment?.vehicle);
    });
    return {
      id: item.id,
      [ValuesHeader.USER]: Formatters.nameFormatter(item),
      [ValuesHeader.EMAIL]: item.email,
      [ValuesHeader.CAR_LINK]: cars,
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
