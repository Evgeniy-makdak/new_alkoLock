import { useMemo } from 'react';

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
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_TABLE_HEADER,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAlcolock[]>,
  toggleAdd: () => void,
  setChangeCar: ({ id, text }: { id: ID; text: string }) => void,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Наименование',
        field: ValuesHeader.NAMING,
        maxWidth: 130,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Серийный номер',
        minWidth: 190,
        field: ValuesHeader.SERIAL_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Установлен на ТС',
        field: ValuesHeader.TC,
      },
      {
        maxWidth: 110,
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        filterable: false,
        renderCell: ({ row }) => {
          return (
            <TableRowControls
              testidEdit={
                testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_BUTTON
              }
              onClickEdit={() => setChangeCar({ id: row.id, text: row?.name })}
              arrowIcon
            />
          );
        },
        renderHeader: () => {
          return <TableHeaderActions refetch={refetch} onClickAddIcon={toggleAdd} />;
        },
        width: 120,
        hideable: false,
        align: 'center',
      },
    ],
    [],
  );
};
