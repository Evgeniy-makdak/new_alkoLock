/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@mui/material';
import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { AccountApi } from '@shared/api/baseQuerys';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
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
  toggleRecover: (id: string, text?: ReactNode) => void,
  toggleTrueDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeUserId: (id: ID) => void,
  isVisibleActionsColum: boolean,
  useHighlightOffIcon: boolean,
  newRefetch: () => Promise<void>,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: storePermissionsFromUsers } = appStore();
  const userPermissions = storePermissionsFromUsers?.filter((p) => p.includes('USER')) || [];
  const hasCreatePermission = storePermissionsFromUsers?.some(
    (perm) => perm === 'PERMISSION_USER_CREATE',
  );
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const shouldShowActionsColumn = userPermissions.length > 0;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await AccountApi.getAccountData();
        setCurrentUserId(Number(response.data?.id) || null);
      } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
      }
    };

    fetchUserData();
  }, []);

  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.user'),
        field: ValuesHeader.USER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.email'),
        width: 200,
        field: ValuesHeader.EMAIL,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.roles'),
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
        headerName: t('tables.access'),
        field: ValuesHeader.ACCESS,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.registrationDate'),
        field: ValuesHeader.CREATED_AT,
        minWidth: 220,
      },
      ...(shouldShowActionsColumn
        ? [
            {
              field: 'actions',
              type: 'actions',
              sortable: false,
              disableClickEventBubbling: true,
              filterable: false,
              width: 120,
              hideable: false,
              align: 'center' as const,
              renderCell: ({ row }: { row: any }) => {
                const roles = row.ROLE || [];
                const isAdmin = roles.includes('Администратор системы');
                const hideEditButton = isAdmin && currentUserId !== 1;
                return (
                  <TableRowControls
                    permissionPrefix="USER"
                    permissions={storePermissionsFromUsers}
                    roles={row.ROLE}
                    isActive={row.isActive}
                    useHighlightOffIcon={useHighlightOffIcon}
                    testidDelete={
                      testids.page_users.users_widget_table
                        .USERS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    testidEdit={
                      testids.page_users.users_widget_table.USERS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                    }
                    onClickEdit={() => setChangeUserId(row.id)}
                    onClickDelete={() => toggleDelete(row.id, <b>{row?.USER}</b>)}
                    onClickRecover={() => toggleRecover(row.id, <b>{row?.USER}</b>)}
                    onTrueDelete={() => toggleTrueDelete(row.id, <b>{row?.USER}</b>)}
                    showEdit={!hideEditButton}
                  />
                );
              },
              renderHeader: () => (
                <TableHeaderActions
                  refetch={refetch}
                  newRefetch={newRefetch}
                  testidAddIcon={
                    testids.page_users.users_widget_table.USERS_WIDGET_TABLE_BODY_ITEM_ACTION_ADD
                  }
                  onClickAddIcon={toggle}
                  hasCreatePermission={hasCreatePermission}
                />
              ),
            },
          ]
        : []),
    ],
    [
      refetch,
      toggleDelete,
      toggleRecover,
      toggleTrueDelete,
      toggle,
      setChangeUserId,
      isVisibleActionsColum,
      currentUserId,
      storePermissionsFromUsers,
      t,
    ],
  );
};
