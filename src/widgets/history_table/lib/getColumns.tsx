/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  ALCOLOKS = SortTypes.ALCOLOKS,
  DATE = SortTypes.DATE_CREATE,
  TC = SortTypes.TC,
  GOS_NUMBER = SortTypes.GOS_NUMBER,
  TYPE_OF_EVENT = SortTypes.TYPE_OF_EVENT,
  NAMING = SortTypes.NAMING,
  INITIATOR = SortTypes.INITIATOR,
  HANDLER = SortTypes.HANDLER,
  CREATED_AT = SortTypes.CREATED_AT,
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
        field: ValuesHeader.CREATED_AT,
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
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.initiator'),
        field: ValuesHeader.INITIATOR,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.executor'),
        width: 200,
        field: ValuesHeader.HANDLER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.vehicleShort'),
        field: ValuesHeader.TC,
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
    [t],
  );
};
