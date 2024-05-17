import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { IAttachmentItems } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IAttachmentItems[]): GridRowsProp => {
  const mapData = (data ? data : []).map((item) => {
    return {
      id: item.id,
      [ValuesHeader.ALCOLOKS]: item.vehicle?.monitoringDevice?.name ?? '-',
      [ValuesHeader.SERIAL_NUMBER]: item.vehicle?.monitoringDevice?.serialNumber ?? '-',
      [ValuesHeader.TC]: item.vehicle ? Formatters.carNameFormatter(item.vehicle) : '-',
      [ValuesHeader.DRIVER]: item.driver?.userAccount
        ? Formatters.nameFormatter(item.driver.userAccount)
        : '-',
      [ValuesHeader.WHO_LINK]: item.createdBy ? Formatters.nameFormatter(item.createdBy) : '-',
      [ValuesHeader.DATE_LINK]: item.createdAt ? Formatters.formatISODate(item.createdAt) : '-',
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
