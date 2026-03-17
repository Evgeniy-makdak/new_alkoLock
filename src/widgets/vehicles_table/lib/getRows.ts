/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import { type ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (car: ICar[]): GridRowsProp => {
  const processingIds = useProcessingStore((state) => state.processingIds.vehicles);

  return useMemo(
    () =>
      (car ? car : []).map((item) => {
        const isProcessing =
          item?.inProcessing || (item?.id != null && processingIds.has(item.id)) || false;
        return {
          id: item.id,
          isProcessing,
          [ValuesHeader.MARK]: item?.manufacturer ?? '-',
          [ValuesHeader.MODEL]: item?.model ?? '-',
          [ValuesHeader.VIN]: item?.vin,
          [ValuesHeader.GOS_NUMBER]: item?.registrationNumber,
          [ValuesHeader.YEAR]: item?.year,
          [ValuesHeader.DATE_CREATE]: Formatters.formatISODate(item?.createdAt),
          isActive: item?.isActive,
        };
      }),
    [car, processingIds],
  );
};
