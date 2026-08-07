import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AutorenewIcon from '@mui/icons-material/Autorenew';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { Box, IconButton, Tooltip } from '@mui/material';
import type {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  GridValueGetterParams,
} from '@mui/x-data-grid';

import { Table } from '@shared/components/Table/Table';

interface SettingRow {
  id: number;
  label: string;
  field: string;
  value: number;
  unit: string;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

interface SettingsDesktopTableProps {
  loading: boolean;
  settingsRows: SettingRow[];
  page: number;
  rowsPerPage: number;
  getUnitDisplay: (unit: string, value: number) => string;
  handleEditClick: (row: SettingRow) => void;
  handleResetToDefault: (row: SettingRow) => void;
  onPaginationModelChange: (model: GridPaginationModel) => void;
}

export const SettingsDesktopTable: React.FC<SettingsDesktopTableProps> = ({
  loading,
  settingsRows,
  page,
  rowsPerPage,
  getUnitDisplay,
  handleEditClick,
  handleResetToDefault,
  onPaginationModelChange,
}) => {
  const { t } = useTranslation();

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'label',
        headerName: t('tables.changeableParam'),
        flex: 1.2,
        minWidth: 280,
        sortable: false,
      },
      {
        field: 'value',
        headerName: t('tables.currentValue'),
        flex: 0.5,
        minWidth: 140,
        sortable: false,
        valueGetter: (params: GridValueGetterParams<SettingRow>) =>
          `${params.row.value} ${getUnitDisplay(params.row.unit, params.row.value)}`,
      },
      {
        field: 'actions',
        headerName: t('tables.actions'),
        width: 140,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<SettingRow>) => (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <Tooltip title={t('common.edit')}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(params.row);
                }}>
                <ModeEditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.resetToDefault')}>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetToDefault(params.row);
                }}>
                <AutorenewIcon />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [t, getUnitDisplay, handleEditClick, handleResetToDefault],
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, width: '100%', height: '100%' }}>
      <Table
        rows={settingsRows}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        disableColumnMenu
        disableRowSelectionOnClick
        hideFooterSelectedRowCount
        paginationMode="client"
        sortingMode="client"
        rowCount={settingsRows.length}
        pageNumber={page}
        pageSize={rowsPerPage}
        pageSizeOptions={[25, 50, 75, 100]}
        paginationModel={{ page, pageSize: rowsPerPage }}
        onPaginationModelChange={onPaginationModelChange}
        sx={{
          '& .MuiDataGrid-cell': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none !important',
          },
        }}
      />
    </Box>
  );
};
