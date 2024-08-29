import React, { useMemo } from 'react';

import { Divider, Stack } from '@mui/material';
import { GridColDef, type GridColumnHeaderParams } from '@mui/x-data-grid';

import { TableHeaderActions } from '@entities/table_header_actions';
import { TableRowControls } from '@entities/table_row_controls/ui/TableRowControls';
import { setTestIdsToHeaderColumns } from '@shared/components/Table/Table';
import { SortTypes } from '@shared/config/queryParamsEnums';
import { testids } from '@shared/const/testid';
import type { IAlcolock, ID } from '@shared/types/BaseQueryTypes';
import type { RefetchType } from '@shared/types/QueryTypes';

export enum ValuesHeader {
  USER = SortTypes.USER,
  EMAIL = SortTypes.EMAIL,
  CAR_LINK = SortTypes.CAR_LINK,
}

const setTestIdsToHeaderColumnsAdapter = (
  row: GridColumnHeaderParams<unknown, unknown, unknown>,
) => {
  return setTestIdsToHeaderColumns(
    row,
    testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_TABLE,
  );
};

export const useGetColumns = (
  refetch: RefetchType<IAlcolock[]>,
  toggleAdd: () => void,
  setChangeUser: ({ id, text }: { id: ID; text: string }) => void,
): GridColDef[] => {
  return useMemo(
    () => [
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Пользователь',
        field: ValuesHeader.USER,
        width: 140,
      },
      {
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Почта',
        width: 180,
        field: ValuesHeader.EMAIL,
      },
      {
        sortable: false,
        renderHeader: setTestIdsToHeaderColumnsAdapter,
        headerName: 'Привязанные ТС',
        field: ValuesHeader.CAR_LINK,
        minWidth: 280,
        renderCell: ({ row }) => {
          const cars: string[] = row?.CAR_LINK || [];
          if (!cars.length) return '-';
          return (
            <Stack spacing={1} paddingY={1}>
              {cars.map((vehicleAllotment: string, i) => (
                <React.Fragment key={vehicleAllotment}>
                  <span key={vehicleAllotment}>{vehicleAllotment}</span>
                  {i !== cars.length - 1 && <Divider color="#b4b5f5" />}
                </React.Fragment>
              ))}
            </Stack>
          );
        },
      },
      {
        minxWidth: 110,
        field: 'actions',
        type: 'actions',
        sortable: false,
        disableClickEventBubbling: true,
        filterable: false,
        renderCell: ({ row }) => {
          return (
            <TableRowControls
              arrowIcon
              onClickEdit={() => setChangeUser({ id: row.id, text: row?.name })}
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
