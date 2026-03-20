/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Chip } from '@mui/material';
import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { entityLabelForI18n } from '@shared/lib/reactNodeToPlainText';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, ID } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  ROLE = SortTypes.NAMING,
  CREATE_PERMISSIONS = 'CREATE_PERMISSIONS',
  READ_PERMISSIONS = 'READ_PERMISSIONS',
  UPDATE_PERMISSIONS = 'UPDATE_PERMISSIONS',
  DELETE_PERMISSIONS = 'DELETE_PERMISSIONS',
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
  newRefetch: () => Promise<void>,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: storePermissionsFromRoles } = appStore();
  const rolesPermissions = storePermissionsFromRoles?.filter((p) => p.includes('ROLES')) || [];
  const hasGroupCreate = rolesPermissions.includes('PERMISSION_ROLES_CREATE');
  const shouldShowActionsColumn = rolesPermissions.length > 0;

  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.role'),
        field: ValuesHeader.ROLE,
        width: 200,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.creation'),
        field: ValuesHeader.CREATE_PERMISSIONS,
        width: 250,
        sortable: false,
        renderCell: (params) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {params.row[ValuesHeader.CREATE_PERMISSIONS]?.map((perm: string) => (
              <Chip key={perm} label={perm} variant="outlined" color="default" />
            ))}
          </div>
        ),
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.reading'),
        field: ValuesHeader.READ_PERMISSIONS,
        width: 250,
        sortable: false,
        renderCell: (params) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {params.row[ValuesHeader.READ_PERMISSIONS]?.map((perm: string) => (
              <Chip key={perm} label={perm} variant="outlined" color="default" />
            ))}
          </div>
        ),
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.modification'),
        field: ValuesHeader.UPDATE_PERMISSIONS,
        width: 250,
        sortable: false,
        renderCell: (params) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {params.row[ValuesHeader.UPDATE_PERMISSIONS]?.map((perm: string) => (
              <Chip key={perm} label={perm} variant="outlined" color="default" />
            ))}
          </div>
        ),
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.deletion'),
        field: ValuesHeader.DELETE_PERMISSIONS,
        width: 250,
        sortable: false,
        renderCell: (params) => (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {params.row[ValuesHeader.DELETE_PERMISSIONS]?.map((perm: string) => (
              <Chip key={perm} label={perm} variant="outlined" color="default" />
            ))}
          </div>
        ),
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
                const disabledAction = row?.disabledAction;
                return (
                  <>
                    {!disabledAction && (
                      <TableRowControls
                        permissionPrefix="ROLES"
                        permissions={rolesPermissions}
                        testidDelete={
                          testids.page_roles.roles_widget_table
                            .ROLES_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                        }
                        testidEdit={
                          testids.page_roles.roles_widget_table
                            .ROLES_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                        }
                        onClickEdit={() => setChangeRoleId(row.id)}
                        onClickDelete={() =>
                          toggleDelete(row.id, entityLabelForI18n(row[ValuesHeader.ROLE]))
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
                    newRefetch={newRefetch}
                    testidAddIcon={
                      testids.page_roles.roles_widget_table.ROLES_WIDGET_TABLE_BODY_ITEM_ACTION_ADD
                    }
                    onClickAddIcon={toggle}
                    hasCreatePermission={hasGroupCreate}
                  />
                );
              },
            },
          ]
        : []),
    ],
    [
      refetch,
      toggleDelete,
      toggle,
      setChangeRoleId,
      newRefetch,
      hasGroupCreate,
      shouldShowActionsColumn,
      t,
    ],
  );
};
