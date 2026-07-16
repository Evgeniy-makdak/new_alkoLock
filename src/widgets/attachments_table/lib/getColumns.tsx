/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
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
  newRefetch: () => Promise<void>,
  isVisibleActionsColumn: boolean,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: storePermissionsFromAttachments } = appStore();
  const attachmentsPermissions =
    storePermissionsFromAttachments?.filter((p) => p.includes('BINDINGS')) || [];
  const hasAttachmentsCreate = attachmentsPermissions.includes('PERMISSION_BINDINGS_CREATE');
  const shouldShowActionsColumn = attachmentsPermissions.length > 0;

  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.alcolock'),
        field: ValuesHeader.ALCOLOKS,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.serialNumber'),
        width: 200,
        field: ValuesHeader.SERIAL_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.vehicleShort'),
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.driver'),
        field: ValuesHeader.DRIVER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.whoLinked'),
        field: ValuesHeader.WHO_LINK,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.attachmentDate'),
        field: ValuesHeader.DATE_LINK,
      },
      ...(shouldShowActionsColumn
        ? [
            {
              field: 'actions',
              type: 'actions',
              sortable: false,
              disableClickEventBubbling: true,
              filterable: false,
              renderCell: ({ row }: { row: any }) => {
                return (
                  <TableRowControls
                    permissionPrefix="BINDINGS"
                    permissions={storePermissionsFromAttachments}
                    testidDelete={
                      testids.page_attachments.attachments_widget_table
                        .ATTACHMENTS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    testidEdit={
                      testids.page_alcolocks.alcolocks_widget_table
                        .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                    }
                    onClickDelete={() => {
                      const tc = row[ValuesHeader.TC];
                      const alc = row[ValuesHeader.ALCOLOKS];
                      const label = [tc, alc]
                        .filter((x) => x != null && x !== '' && x !== '-')
                        .join(' · ');
                      toggleDelete(row.id, label || String(row.id));
                    }}
                    showEdit={false}
                  />
                );
              },
              renderHeader: () => {
                return (
                  <TableHeaderActions
                    refetch={refetch}
                    newRefetch={newRefetch}
                    testidAddIcon={
                      testids.page_attachments.attachments_widget_table
                        .ATTACHMENTS_WIDGET_TABLE_HEADER_ITEM_OPEN_MODAL
                    }
                    onClickAddIcon={toggle}
                    hasCreatePermission={hasAttachmentsCreate}
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
      refetch,
      toggleDelete,
      toggle,
      isVisibleActionsColumn,
      storePermissionsFromAttachments,
      t,
      hasAttachmentsCreate,
      shouldShowActionsColumn,
      newRefetch,
    ],
  );
};
