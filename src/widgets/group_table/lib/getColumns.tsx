/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IBranch, ID } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  NAMING = SortTypes.NAMING,
  WHO_CREATE = SortTypes.WHO_CREATE,
  DATE_CREATE = SortTypes.DATE_CREATE,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_groups.groups_widget_table.GROUPS_WIDGET_TABLE_HEADER_ITEM,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IBranch[]>,
  toggleDelete: (id: ID, text?: string) => void,
  toggleAdd: () => void,
  setChangeBranch: (data: { id: number; name: string }) => void,
  newRefetch: () => Promise<void>,
  isVisibleActionsColumn: boolean = false,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: storePermissionsFromGroup } = appStore();
  const hasSystemGlobalAdmin = storePermissionsFromGroup?.includes('SYSTEM_GLOBAL_ADMIN') || false;

  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.groupName'),
        field: ValuesHeader.NAMING,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.createdBy'),
        width: 200,
        field: ValuesHeader.WHO_CREATE,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.creationDate'),
        field: ValuesHeader.DATE_CREATE,
      },
      ...(isVisibleActionsColumn || hasSystemGlobalAdmin
        ? [
            {
              field: 'actions',
              type: 'actions',
              sortable: false,
              disableClickEventBubbling: true,
              filterable: false,
              renderCell: ({ row }: { row: any }) => {
                if (row?.disabledAction) return <></>;
                return (
                  <TableRowControls
                    permissions={storePermissionsFromGroup}
                    permissionPrefix="GROUPS"
                    testidDelete={
                      testids.page_groups.groups_widget_table
                        .GROUPS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    testidEdit={
                      testids.page_groups.groups_widget_table
                        .GROUPS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                    }
                    onClickEdit={() => {
                      setChangeBranch({ id: row?.id, name: row?.NAMING });
                      toggleAdd();
                    }}
                    onClickDelete={() => toggleDelete(row.id, `${row.NAMING}`)}
                  />
                );
              },
              renderHeader: () => {
                return (
                  <TableHeaderActions
                    refetch={refetch}
                    newRefetch={newRefetch}
                    testidAddIcon={
                      testids.page_groups.groups_widget_table
                        .GROUPS_WIDGET_TABLE_HEADER_ITEM_OPEN_MODAL
                    }
                    onClickAddIcon={toggleAdd}
                    hasCreatePermission={hasSystemGlobalAdmin}
                  />
                );
              },
              width: 120,
              hideable: false,
              align: 'center' as const,
            },
          ]
        : []),
    ],
    [
      newRefetch,
      refetch,
      setChangeBranch,
      toggleAdd,
      toggleDelete,
      isVisibleActionsColumn,
      storePermissionsFromGroup,
      hasSystemGlobalAdmin,
      t,
    ],
  );
};
