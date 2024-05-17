import { type ReactNode, useMemo } from 'react';

import { Chip } from '@mui/material';
import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IAlcolock, ID } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

import style from '../ui/UsersTable.module.scss';

export enum ValuesHeader {
  USER = SortTypes.USER,
  EMAIL = SortTypes.EMAIL,
  ROLE = SortTypes.ROLE,
  ACCESS = SortTypes.ACCESS,
  CREATED_AT = SortTypes.DATE_CREATE,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_users.users_widget_table.USERS_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAlcolock[]>,
  toggleDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeUserId: (id: ID) => void,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Пользователь',
        field: ValuesHeader.USER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Почта',
        width: 200,
        field: ValuesHeader.EMAIL,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Роли',
        field: ValuesHeader.ROLE,
        minWidth: 250,
        sortable: false,
        renderCell: ({ row }) => {
          const roles = row?.ROLE || [];

          return (
            <div className={style.rolesWrapper}>
              {roles.map((role: string) => (
                <Chip key={role} variant="outlined" color="default" label={role} />
              ))}
            </div>
          );
        },
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Доступ',
        field: ValuesHeader.ACCESS,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Дата регистрации',
        field: ValuesHeader.CREATED_AT,
        minWidth: 220,
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
          return (
            <TableRowControls
              testidDelete={
                testids.page_users.users_widget_table.USERS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
              }
              testidEdit={
                testids.page_users.users_widget_table.USERS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
              }
              onClickEdit={() => setChangeUserId(row.id)}
              onClickDelete={() =>
                toggleDelete(
                  row.id,
                  <>
                    <b>{row?.EMAIL}</b>
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
                testids.page_users.users_widget_table.USERS_WIDGET_TABLE_BODY_ITEM_ACTION_ADD
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
