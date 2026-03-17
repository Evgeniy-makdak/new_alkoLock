/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ICar, ID } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

// import { CarsApi } from '@shared/api/baseQuerys';

export enum ValuesHeader {
  MARK = SortTypes.MARK,
  MODEL = SortTypes.MODEL,
  VIN = SortTypes.VIN,
  GOS_NUMBER = SortTypes.GOS_NUMBER,
  YEAR = SortTypes.YEAR,
  DATE_CREATE = SortTypes.DATE_CREATE,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_transports.transports_widget_table.TRANSPORT_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE,
  );
};

export const useGetColumns = (
  refetch: RefetchType<ICar[]>,
  toggleDelete: (id: string, text?: ReactNode) => void,
  toggleRecover: (id: string, text?: ReactNode) => void,
  toggleTrueDelete: (id: string, text?: ReactNode) => void,
  toggle: () => void,
  setChangeCarsId: (id: ID) => void,
  isVisibleActionsColum: boolean,
  useHighlightOffIcon: boolean,
  newRefetch: () => Promise<void>,
): GridColDef[] => {
  const { t } = useTranslation();
  const { permissions: storePermissionsFromVehicle } = appStore();
  const hasCreatePermission = storePermissionsFromVehicle?.some(
    (perm) => perm === 'PERMISSION_VEHICLE_CREATE',
  );
  const vehiclePermissions =
    storePermissionsFromVehicle?.filter((p) => p.includes('VEHICLE')) || [];
  const shouldShowActionsColumn = vehiclePermissions.length > 0;

  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.mark'),
        field: ValuesHeader.MARK,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.model'),
        width: 200,
        field: ValuesHeader.MODEL,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'VIN',
        field: ValuesHeader.VIN,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.stateNumber'),
        field: ValuesHeader.GOS_NUMBER,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.yearOfManufacture'),
        field: ValuesHeader.YEAR,
        minWidth: 220,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: t('tables.registrationDate'),
        field: ValuesHeader.DATE_CREATE,
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
                    permissionPrefix="VEHICLE"
                    permissions={storePermissionsFromVehicle}
                    testidDelete={
                      testids.page_transports.transports_widget_table
                        .TRANSPORT_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    testidEdit={
                      testids.page_transports.transports_widget_table
                        .TRANSPORT_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    onClickEdit={() => setChangeCarsId(row.id)}
                    useHighlightOffIcon={useHighlightOffIcon}
                    isActive={row.isActive}
                    onClickDelete={() =>
                      toggleDelete(
                        row?.id,
                        <>
                          <b>
                            {row?.MARK} {row?.MODEL} ({row?.GOS_NUMBER})
                          </b>
                        </>,
                      )
                    }
                    onClickRecover={() =>
                      toggleRecover(
                        row?.id,
                        <>
                          <b>
                            {row?.MARK} {row?.MODEL} ({row?.GOS_NUMBER})
                          </b>
                        </>,
                      )
                    }
                    onTrueDelete={() =>
                      toggleTrueDelete(
                        row?.id,
                        <>
                          <b>
                            {row?.MARK} {row?.MODEL} ({row?.GOS_NUMBER})
                          </b>
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
                    newRefetch={newRefetch}
                    testidAddIcon={
                      testids.page_transports.transports_widget_table
                        .TRANSPORT_WIDGET_TABLE_BODY_ITEM_ACTION_DELETE
                    }
                    onClickAddIcon={toggle}
                    hasCreatePermission={hasCreatePermission}
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
      toggleRecover,
      toggle,
      setChangeCarsId,
      isVisibleActionsColum,
      toggleTrueDelete,
      storePermissionsFromVehicle,
      t,
    ],
  );
};
