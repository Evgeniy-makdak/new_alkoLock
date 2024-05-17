import { useMemo } from 'react';

import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IAttachmentItems } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  DRIVER = SortTypes.DRIVER,
  ALCOLOKS = SortTypes.ALCOLOKS,
  SERIAL_NUMBER = SortTypes.SERIAL_NUMBER,
  TC = SortTypes.TC,
  WHO_LINK = SortTypes.WHO_LINK,
  DATE_LINK = SortTypes.DATE_CREATE,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_attachments.attachments_widget_table.ATTACHMENTS_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  toggle: () => void,
  toggleDelete: (id: number, text: string) => void,
  refetch: RefetchType<IAttachmentItems[]>,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Алкозамок',
        field: ValuesHeader.ALCOLOKS,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Серийный номер',
        width: 200,
        field: ValuesHeader.SERIAL_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'ТС',
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Водитель',
        field: ValuesHeader.DRIVER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Кем привязан',
        field: ValuesHeader.WHO_LINK,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Дата привязки',
        field: ValuesHeader.DATE_LINK,
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
                testids.page_attachments.attachments_widget_table
                  .ATTACHMENTS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
              }
              testidEdit={
                testids.page_alcolocks.alcolocks_widget_table
                  .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
              }
              onClickDelete={() => toggleDelete(row.id, row?.ALCOLOKS)}
            />
          );
        },
        renderHeader: () => {
          return (
            <TableHeaderActions
              refetch={refetch}
              testidAddIcon={
                testids.page_attachments.attachments_widget_table
                  .ATTACHMENTS_WIDGET_TABLE_HEADER_ITEM_OPEN_MODAL
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
