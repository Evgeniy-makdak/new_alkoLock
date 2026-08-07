import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import ModeEditIcon from '@mui/icons-material/ModeEdit';
import { Box, IconButton, Tooltip } from '@mui/material';
import type {
  GridColDef,
  GridPaginationModel,
  GridRenderCellParams,
  GridRowParams,
  GridSortModel,
  GridValueGetterParams,
} from '@mui/x-data-grid';

import { Table } from '@shared/components/Table/Table';
import { TEMPLATE_TYPES_LABEL_MAP } from '@shared/lib/templateTypesLabelMap';

import { EmailTemplate } from '../templates/types';

interface TemplatesDesktopTableProps {
  templates: EmailTemplate[];
  loading: boolean;
  sortField: keyof EmailTemplate | null;
  sortOrder: 'ASC' | 'DESC' | null;
  selectedRowId: number | null;
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onRequestSort: (property: keyof EmailTemplate) => void;
  onToggleStatus: (id: number) => void;
  onEditClick: (template: EmailTemplate) => void;
  onDeleteClick: (template: EmailTemplate) => void;
  onViewClick: (template: EmailTemplate) => void;
  onPaginationModelChange: (model: GridPaginationModel) => void;
}

export const TemplatesDesktopTable: React.FC<TemplatesDesktopTableProps> = ({
  templates,
  loading,
  sortField,
  sortOrder,
  selectedRowId,
  totalCount,
  page,
  rowsPerPage,
  onRequestSort,
  onToggleStatus,
  onEditClick,
  onDeleteClick,
  onViewClick,
  onPaginationModelChange,
}) => {
  const { t } = useTranslation();

  const sortModel: GridSortModel = useMemo(() => {
    if (!sortField || !sortOrder) return [];
    return [{ field: String(sortField), sort: sortOrder === 'ASC' ? 'asc' : 'desc' }];
  }, [sortField, sortOrder]);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'name',
        headerName: t('tables.name'),
        flex: 1,
        minWidth: 160,
      },
      {
        field: 'createdBy',
        headerName: t('tables.author'),
        flex: 0.7,
        minWidth: 120,
        valueGetter: (params: GridValueGetterParams<EmailTemplate>) =>
          params.row.createdBy?.firstName || '—',
      },
      {
        field: 'createdAt',
        headerName: t('tables.creationDate'),
        flex: 0.7,
        minWidth: 140,
      },
      {
        field: 'templateType',
        headerName: t('tables.templateType'),
        flex: 0.8,
        minWidth: 140,
        valueGetter: (params: GridValueGetterParams<EmailTemplate>) => {
          const name = params.row.templateType?.name;
          if (!name) return '—';
          return t(
            TEMPLATE_TYPES_LABEL_MAP[name] ?? `templateTypes.${params.row.templateType?.type ?? ''}`,
            { defaultValue: name },
          );
        },
      },
      {
        field: 'lastModifiedAt',
        headerName: t('tables.modificationDate'),
        flex: 0.7,
        minWidth: 140,
        valueGetter: (params: GridValueGetterParams<EmailTemplate>) =>
          params.row.lastModifiedAt || '—',
      },
      {
        field: 'actions',
        headerName: t('tables.actions'),
        width: 160,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<EmailTemplate>) => {
          const template = params.row;
          const systemOwned = template.createdBy?.id === 0;
          return (
            <Box
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}
              onClick={(e) => e.stopPropagation()}>
              <Tooltip title={template.actual ? t('tooltips.templateActive') : t('common.activate')}>
                <IconButton onClick={() => onToggleStatus(template.id)}>
                  {template.actual ? <CheckCircleOutlineIcon /> : <HighlightOffIcon />}
                </IconButton>
              </Tooltip>
              <Tooltip title={t('common.edit')}>
                <span style={{ visibility: systemOwned ? 'hidden' : 'visible' }}>
                  <IconButton onClick={() => onEditClick(template)} color="inherit">
                    <ModeEditIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t('common.delete')}>
                <span style={{ visibility: systemOwned ? 'hidden' : 'visible' }}>
                  <IconButton onClick={() => onDeleteClick(template)} color="inherit">
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    [t, onToggleStatus, onEditClick, onDeleteClick],
  );

  return (
    <Box sx={{ flex: 1, minHeight: 0, width: '100%', height: '100%' }}>
      <Table
        rows={templates}
        columns={columns}
        loading={loading}
        getRowId={(row) => row.id}
        pointer
        disableColumnMenu
        disableRowSelectionOnClick
        hideFooterSelectedRowCount
        paginationMode="server"
        sortingMode="server"
        rowCount={totalCount}
        pageNumber={page}
        pageSize={rowsPerPage}
        pageSizeOptions={[25, 50, 75, 100]}
        paginationModel={{ page, pageSize: rowsPerPage }}
        onPaginationModelChange={onPaginationModelChange}
        sortModel={sortModel}
        onSortModelChange={(model) => {
          const next = model[0];
          if (!next?.field) {
            onRequestSort(sortField || 'name');
            return;
          }
          onRequestSort(next.field as keyof EmailTemplate);
        }}
        onRowClick={(params: GridRowParams<EmailTemplate>) => onViewClick(params.row)}
        getRowClassName={(params) => (params.id === selectedRowId ? 'selected-row' : '')}
        sx={{
          '& .MuiDataGrid-cell': {
            outline: 'none !important',
          },
          '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
            outline: 'none !important',
          },
          '& .selected-row': {
            backgroundColor: 'rgba(0, 0, 0, 0.08) !important',
          },
        }}
      />
    </Box>
  );
};
