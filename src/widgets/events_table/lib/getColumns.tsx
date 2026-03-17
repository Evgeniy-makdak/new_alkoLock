/* eslint-disable no-console */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@mui/material';
import { type GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  DATE_OCCURRENT = SortTypes.DATE_OCCURRENT,
  ALCOLOKS = SortTypes.ALCOLOKS,
  INTITIATOR = SortTypes.CREATED_BY,
  TC = SortTypes.TC,
  GOS_NUMBER = SortTypes.GOS_NUMBER,
  TYPE_OF_EVENT = SortTypes.TYPE_OF_EVENT,
  LEVEL = SortTypes.LEVEL,
  STATE = SortTypes.STATE,
  EXPIRES = SortTypes.EXPIRES,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_events.events_widget_table.EVENTS_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IDeviceAction[]>,
  newRefetch: () => Promise<void>,
): GridColDef[] => {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.date'),
        field: ValuesHeader.DATE_OCCURRENT,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.initiator'),
        width: 200,
        field: ValuesHeader.INTITIATOR,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.vehicleShort'),
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.alcolock'),
        field: ValuesHeader.ALCOLOKS,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.eventType'),
        field: ValuesHeader.TYPE_OF_EVENT,
        renderCell: (params) => {
          const typeOfEvent = params.value as string;
          if (typeOfEvent.includes('Ошибка E-') || typeOfEvent.includes('Неразрешенное движение')) {
            return <Chip label={typeOfEvent} color="error" />;
          }
          if (typeOfEvent.includes('Тестирование пройдено')) {
            return <Chip label={typeOfEvent} color="success" />;
          }
          if (
            typeOfEvent.includes('Тестирование не пройдено') ||
            typeOfEvent.includes('Невозможно заблокировать двигатель, ТС в движении')
          ) {
            return <Chip label={typeOfEvent} color="error" />;
          }
          if (typeOfEvent.includes('Тестирование прервано')) {
            return <Chip label={typeOfEvent} color="warning" />;
          }
          if (typeOfEvent.includes('Фальсификация выдоха')) {
            return <Chip label={typeOfEvent} color="error" />;
          }
          return typeOfEvent;
        },
      },
      {
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        getActions: () => [],
        filterable: false,
        renderHeader: () => {
          return <TableHeaderActions refetch={refetch} newRefetch={newRefetch} />;
        },
        width: 50,
        hideable: false,
        align: 'center',
      },
    ],
    [refetch, newRefetch, t],
  );
};
