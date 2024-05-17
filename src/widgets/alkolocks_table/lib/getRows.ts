import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { AppConstants } from '@app/index';
import { type IAlcolock } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IAlcolock[]): GridRowsProp => {
  const mapData = (data ? data : []).map((item) => {
    const car = item?.vehicleBind?.vehicle;
    return {
      id: item.id,
      [ValuesHeader.NAMING]: item?.name ?? '-' ?? '-',
      [ValuesHeader.SERIAL_NUMBER]: item.serialNumber ?? '-',
      [ValuesHeader.TC]: Formatters.carNameFormatter(car),
      [ValuesHeader.OPERATING_MODE]:
        AppConstants.alkolockWorkModes.find((mode) => mode.value === item.mode)?.label ?? '-',
      [ValuesHeader.WHO_LINK]: Formatters.nameFormatter(item.createdBy),
      [ValuesHeader.DATA_INSTALLATION]: Formatters.formatISODate(item.createdAt),
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
