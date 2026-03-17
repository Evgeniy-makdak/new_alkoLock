/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
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
  toggleRecover: (id: string, text?: ReactNode) => void,
  toggleTrueDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeAlkolockId: (id: ID) => void,
  isVisibleActionsColum: boolean,
  useHighlightOffIcon: boolean,
  newRefetch: () => Promise<void>,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: storePermissionsFromAlkolocks } = appStore();
  const devicePermissions =
    storePermissionsFromAlkolocks?.filter((p) => p.includes('DEVICE')) || [];
  const hasDeviceCreate = devicePermissions.includes('PERMISSION_DEVICE_CREATE');
  const shouldShowActionsColumn = devicePermissions.length > 0;

  return useMemo(() => {
    const columns = [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.naming'),
        field: ValuesHeader.NAMING,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.serialNumber'),
        width: 200,
        field: ValuesHeader.SERIAL_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.installedOnVehicle'),
        field: ValuesHeader.TC,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.operatingMode'),
        field: ValuesHeader.OPERATING_MODE,
        type: 'string',
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.whoLinked'),
        field: ValuesHeader.WHO_LINK,
        minWidth: 220,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.installationDate'),
        field: ValuesHeader.DATA_INSTALLATION,
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
                    permissionPrefix="DEVICE"
                    permissions={devicePermissions}
                    testidDelete={
                      testids.page_alcolocks.alcolocks_widget_table
                        .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    testidEdit={
                      testids.page_alcolocks.alcolocks_widget_table
                        .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_EDIT
                    }
                    onClickEdit={() => setChangeAlkolockId(row.id)}
                    useHighlightOffIcon={useHighlightOffIcon}
                    isActive={row.isActive}
                    onClickDelete={() => {
                      toggleDelete(row.id, row.NAMING);
                    }}
                    onClickRecover={() => {
                      toggleRecover(row.id, row.NAMING);
                    }}
                    onTrueDelete={() => {
                      toggleTrueDelete(row.id, row.NAMING);
                    }}
                  />
                );
              },
              renderHeader: () => {
                return (
                  <TableHeaderActions
                    refetch={refetch}
                    newRefetch={newRefetch}
                    testidAddIcon={
                      testids.page_alcolocks.alcolocks_widget_table
                        .ALCOLOCKS_WIDGET_TABLE_BODY_ITEM_ACTION_ADD
                    }
                    onClickAddIcon={hasDeviceCreate ? toggle : undefined}
                  />
                );
              },
              width: 120,
              hideable: false,
              align: 'center' as const,
            },
          ]
        : []),
    ];
    return columns;
  }, [
    isVisibleActionsColum,
    devicePermissions,
    refetch,
    setChangeAlkolockId,
    toggle,
    toggleDelete,
    toggleTrueDelete,
    useHighlightOffIcon,
    newRefetch,
    hasDeviceCreate,
    shouldShowActionsColumn,
    t,
  ]);
};
