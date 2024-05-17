import { type ReactNode, useMemo } from 'react';

import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IAlcolock, ID } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  MARK = SortTypes.MARK,
  MODEL = SortTypes.MODEL,
  VIN = SortTypes.VIN,
  GOS_NUMBER = SortTypes.GOS_NUMBER,
  YEAR = SortTypes.YEAR,
  DATE_CREATE = SortTypes.DATE_CREATE,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_transports.transports_widget_table.TRANSPORT_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAlcolock[]>,
  toggleDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeVehiclesId: (id: ID) => void,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Марка',
        field: ValuesHeader.MARK,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Модель',
        width: 200,
        field: ValuesHeader.MODEL,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'VIN',
        field: ValuesHeader.VIN,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Государственный номер',
        field: ValuesHeader.GOS_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Год выпуска',
        field: ValuesHeader.YEAR,
        minWidth: 220,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Дата регистрации',
        field: ValuesHeader.DATE_CREATE,
      },
      {
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        filterable: false,
        renderCell: ({ row }) => {
          return (
            <TableRowControls
              testidDelete={
                testids.page_transports.transports_widget_table
                  .TRANSPORT_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
              }
              testidEdit={
                testids.page_transports.transports_widget_table
                  .TRANSPORT_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
              }
              onClickEdit={() => setChangeVehiclesId(row.id)}
              onClickDelete={() =>
                toggleDelete(
                  row?.id,
                  <>
                    <b>
                      {row?.MARK}, {row?.MODEL}, {row?.YEAR}, {row?.GOS_NUMBER}
                    </b>
                  </>,
                )
              }
            />
          );
        },
        renderHeader: () => {
          return (
            <TableHeaderActions
              refetch={refetch}
              testidAddIcon={
                testids.page_transports.transports_widget_table
                  .TRANSPORT_WIDGET_TABLE_HEADER_ITEM_OPEN_MODAL
              }
              onClickAddIcon={toggle}
            />
          );
        },
        width: 120,
        hideable: false,
        align: 'center',
      },
    ],
    [],
  );
};
