/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { GridRowsProp } from '@mui/x-data-grid';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import { type IAlcolock } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

const translateMode = (mode: string, t: (key: string) => string): string => {
  const m = (mode || '').trim().toLowerCase();
  if (m === 'рабочий' || m === 'working' || m === 'work') return t('deviceMode.working');
  if (m === 'аварийный' || m === 'emergency') return t('deviceMode.emergency');
  if (m === 'сервисный' || m === 'service') return t('deviceMode.service');
  return mode || '-';
};

export const useGetRows = (data: IAlcolock[]): GridRowsProp => {
  const { t } = useTranslation();
  const processingIds = useProcessingStore((state) => state.processingIds.alkolocks);

  return useMemo(
    () =>
      (data ? data : []).map((item) => {
        const car = item?.vehicleBind?.vehicle;
        const isProcessing =
          item?.inProcessing || (item?.id != null && processingIds.has(item.id)) || false;

        return {
          id: item.id,
          isProcessing,
          [ValuesHeader.NAMING]: item?.name ?? '-',
          [ValuesHeader.SERIAL_NUMBER]: item.serialNumber ?? '-',
          [ValuesHeader.TC]: Formatters.carNameFormatter(car) || '-',
          [ValuesHeader.OPERATING_MODE]: translateMode(item?.mode ?? '', t),
          [ValuesHeader.WHO_LINK]: Formatters.nameFormatter(item?.vehicleBind?.createdBy),
          [ValuesHeader.DATA_INSTALLATION]: Formatters.formatISODate(item?.vehicleBind?.createdAt),
          isActive: item.isActive,
        };
      }),
    [data, processingIds, t],
  );
};
