import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { type IBranch } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IBranch[]): GridRowsProp => {
  const mapData = (data ? data : []).map((item) => {
    return {
      id: item?.id,
      disabledAction: item?.systemGenerated,
      [ValuesHeader.NAMING]: item?.name ?? '-',
      [ValuesHeader.WHO_CREATE]: Formatters.nameFormatter(item.createdBy),
      [ValuesHeader.DATE_CREATE]: Formatters.formatISODate(item.createdAt),
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
