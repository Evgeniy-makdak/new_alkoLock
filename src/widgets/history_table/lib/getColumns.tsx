import { useMemo } from 'react';

import { type GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  DATE = SortTypes.DATE_CREATE,
  EXEQUTOR = SortTypes.CREATED_BY,
  TC = SortTypes.TC,
  GOS_NUMBER = SortTypes.GOS_NUMBER,
  TYPE_OF_EVENT = SortTypes.TYPE_OF_EVENT,
  NAMING = SortTypes.NAMING,
  INITIATOR = SortTypes.CREATED_BY,
  DATE_OCCURRENT = "DATE_OCCURRENT",
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_events.events_widget_table.EVENTS_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (refetch: RefetchType<IDeviceAction[]>): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Дата',
        field: ValuesHeader.DATE,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Тип события',
        field: ValuesHeader.TYPE_OF_EVENT,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Инициатор',
        field: ValuesHeader.INITIATOR,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Исполнитель',
        width: 200,
        field: ValuesHeader.EXEQUTOR,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'ТС',
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Алкозамок',
        field: ValuesHeader.NAMING,
      },
      {
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        getActions: () => [],
        filterable: false,
        renderHeader: () => {
          return <TableHeaderActions refetch={refetch} />;
        },
        width: 50,
        hideable: false,
        align: 'center',
      },
    ],
    [],
  );
};
