/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { AccountApi } from '@shared/api/baseQuerys';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID, IEmailNotification } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  EMAIL = SortTypes.EMAIL,
  TYPE_OF_EVENT = SortTypes.TYPE_OF_EVENT,
  TIME_INTERVAL = SortTypes.TIME_INTERVAL,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_users.users_widget_table.USERS_WIDGET_TABLE_HEADER_ITEM,
  );
};

type RefetchFunction = () => Promise<void> | void;

export const useGetColumns = (
  refetch: RefetchType<IEmailNotification[]> | RefetchFunction,
  toggleDelete: (id: string, text?: ReactNode) => void,
  toggleRecover: (id: string, text?: ReactNode) => void,
  toggleTrueDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeUserId: (id: ID, email?: string) => void,
  isVisibleActionsColum: boolean,
  useHighlightOffIcon: boolean,
  newRefetch: RefetchFunction,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: mailingsTableStore } = appStore();

  const hasCreatePermission = mailingsTableStore?.some(
    (perm) => perm === 'PERMISSION_NOTIFICATIONS_CREATE' || perm === 'SYSTEM_GLOBAL_ADMIN',
  );

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const shouldShowActionsColumn = isVisibleActionsColum;

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
        headerName: t('tables.mail'),
        width: 250,
        field: ValuesHeader.EMAIL,
        sortable: true,
        renderCell: ({ row }: { row: any }) => {
          if (row._isFirstRow) {
            return (
              <div
                className="email-cell-grouped"
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  padding: '8px 0',
                }}>
                {row[ValuesHeader.EMAIL]}
              </div>
            );
          }
          return null;
        },
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.eventType'),
        width: 300,
        field: ValuesHeader.TYPE_OF_EVENT,
        sortable: false,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.interval'),
        width: 250,
        field: ValuesHeader.TIME_INTERVAL,
        sortable: false,
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
                if (!row._isFirstRow) {
                  return null;
                }

                const email = row._email || row[ValuesHeader.EMAIL];

                return (
                  <div
                    className="actions-cell-grouped"
                    style={{
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 0',
                    }}>
                    <TableRowControls
                      permissionPrefix="NOTIFICATIONS"
                      permissions={mailingsTableStore}
                      roles={[]}
                      isActive={row.isActive}
                      useHighlightOffIcon={useHighlightOffIcon}
                      testidDelete={
                        testids.page_users.users_widget_table
                          .USERS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                      }
                      testidEdit={
                        testids.page_users.users_widget_table
                          .USERS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                      }
                      onClickEdit={() => setChangeUserId(email)}
                      onClickDelete={() => toggleDelete(email, String(email))}
                      onClickRecover={() => toggleRecover(email, String(email))}
                      onTrueDelete={() => toggleTrueDelete(email, String(email))}
                      showEdit={true}
                    />
                  </div>
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
      mailingsTableStore,
      newRefetch,
      hasCreatePermission,
      shouldShowActionsColumn,
      useHighlightOffIcon,
      t,
    ],
  );
};
