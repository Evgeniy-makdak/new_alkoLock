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
  ROLE = SortTypes.NAMING,
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  TC_MANAGEMENT = 'TC_MANAGEMENT',
  ALKOLOCK_MANAGEMENT = 'ALKOLOCK_MANAGEMENT',
  ATTACHMENT_MANAGEMENTS = 'ATTACHMENT_MANAGEMENTS',
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_roles.roles_widget_table.ROLES_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAlcolock[]>,
  toggleDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeRoleId: (id: ID) => void,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Роль',
        field: ValuesHeader.ROLE,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Управление пользователями',
        width: 200,
        field: ValuesHeader.USER_MANAGEMENT,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Управление ТС',
        field: ValuesHeader.TC_MANAGEMENT,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Управление алкозамками',
        field: ValuesHeader.ALKOLOCK_MANAGEMENT,
        minWidth: 220,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Управление привязками',
        field: ValuesHeader.ATTACHMENT_MANAGEMENTS,
        minWidth: 220,
        sortable: false,
      },
      {
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        filterable: false,
        width: 120,
        hideable: false,
        align: 'center',
        renderCell: ({ row }) => {
          const disabledAction = row?.disabledAction;
          return (
            <>
              {!disabledAction && (
                <TableRowControls
                  testidDelete={
                    testids.page_roles.roles_widget_table.ROLES_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                  }
                  testidEdit={
                    testids.page_roles.roles_widget_table.ROLES_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                  }
                  onClickEdit={() => setChangeRoleId(row.id)}
                  onClickDelete={() =>
                    toggleDelete(
                      row.id,
                      <>
                        <b>{row[ValuesHeader.ROLE]}</b>
                      </>,
                    )
                  }
                />
              )}
            </>
          );
        },
        renderHeader: () => {
          return (
            <TableHeaderActions
              refetch={refetch}
              testidAddIcon={
                testids.page_roles.roles_widget_table.ROLES_WIDGET_TABLE_BODY_ITEM_ACTION_ADD
              }
              onClickAddIcon={toggle}
            />
          );
        },
      },
    ],
    [],
  );
};
