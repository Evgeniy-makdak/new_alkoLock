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
  NAMING = SortTypes.NAMING,
  SERIAL_NUMBER = SortTypes.SERIAL_NUMBER,
  TC = SortTypes.TC,
  OPERATING_MODE = SortTypes.OPERATING_MODE,
  WHO_LINK = SortTypes.WHO_LINK,
  DATA_INSTALLATION = SortTypes.DATA_INSTALLATION,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_alcolocks.alcolocks_widget_table.ALCOLOCKS_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAlcolock[]>,
  toggleDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeAlkolockId: (id: ID) => void,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Наименование',
        field: ValuesHeader.NAMING,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Серийный номер',
        width: 200,
        field: ValuesHeader.SERIAL_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Установлен на ТС',
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Режим работы',
        field: ValuesHeader.OPERATING_MODE,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Кем привязан',
        field: ValuesHeader.WHO_LINK,
        minWidth: 220,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Дата установки на ТС',
        field: ValuesHeader.DATA_INSTALLATION,
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
                testids.page_alcolocks.alcolocks_widget_table
                  .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
              }
              testidEdit={
                testids.page_alcolocks.alcolocks_widget_table
                  .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
              }
              onClickEdit={() => setChangeAlkolockId(row.id)}
              onClickDelete={() =>
                toggleDelete(
                  row.id,
                  <>
                    {row.NAMING} {row.SERIAL_NUMBER}{' '}
                    {row?.TC ? (
                      <>
                        с привязанным к нему ТС <b>{row?.TC}</b>
                      </>
                    ) : (
                      ''
                    )}
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
                testids.page_alcolocks.alcolocks_widget_table
                  .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_ADD
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
