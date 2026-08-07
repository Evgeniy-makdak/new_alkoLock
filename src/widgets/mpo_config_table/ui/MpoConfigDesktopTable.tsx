import { type FC, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, CircularProgress, Snackbar, Typography } from '@mui/material';
import type { GridPaginationModel } from '@mui/x-data-grid';

import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';

import { useMpoConfigTable } from '../hooks/useMpoConfigTable';
import { useGetColumns } from '../lib/getColumns';
import { FeatureSwitch } from './FeatureSwitch';
import styles from './MpoConfigTable.module.scss';
import { MpoResetConfirmationDialog } from './MpoResetConfirmationDialog';
import { MpoToggleConfirmationDialog } from './MpoToggleConfirmationDialog';

const DEFAULT_PAGE_SIZE = 25;

export const MpoConfigDesktopTable: FC = () => {
  const { t } = useTranslation();
  const {
    isLoading,
    roles,
    localFeatureRows,
    globalCells,
    pendingIds,
    notification,
    closeNotification,
    requestToggleFeature,
    toggleDialogOpen,
    pendingToggle,
    closeToggleDialog,
    confirmToggleFeature,
    isResetting,
    resetDialogOpen,
    openResetDialog,
    closeResetDialog,
    resetToDefaults,
  } = useMpoConfigTable();

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const columns = useGetColumns({
    roles,
    pendingIds,
    isResetting,
    onToggle: requestToggleFeature,
  });

  return (
    <div className={styles.tableWrapper}>
      <Box
        className={styles.globalSection}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
          flexShrink: 0,
        }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              px: 2,
              pt: 0,
              pb: 1,
              fontWeight: 700,
              color: 'text.secondary',
            }}>
            {t('mpoConfigPage.globalParameters')}
          </Typography>

          <div className={styles.globalToggles}>
            {globalCells.map((cell) => {
              const feature = cell.feature;
              const checked = !!feature?.isEnabled;
              const disabled =
                !feature || pendingIds.has(String(feature.id)) || isResetting;
              return (
                <FeatureSwitch
                  key={cell.id}
                  checked={checked}
                  disabled={disabled}
                  label={cell.label}
                  onChange={(next) => requestToggleFeature(feature, next)}
                />
              );
            })}
          </div>
        </Box>

        <Box sx={{ flexShrink: 0, pr: 2, display: 'flex', alignItems: 'center' }}>
          <TableHeaderEndToolbar>
            <ResetFilters
              reset={openResetDialog}
              title={t('mpoConfigPage.resetToDefaults')}
            />
          </TableHeaderEndToolbar>
        </Box>
      </Box>

      <Typography
        variant="subtitle2"
        sx={{
          px: 2,
          pt: 1,
          pb: 1,
          fontWeight: 700,
          color: 'text.secondary',
          flexShrink: 0,
        }}>
        {t('mpoConfigPage.localParameters')}
      </Typography>

      <div className={styles.scrollableTable}>
        {isLoading && localFeatureRows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table
            key={`mpo-local-${localFeatureRows.map((row) => row.id).join('|')}`}
            rows={localFeatureRows}
            columns={columns}
            loading={isLoading || isResetting}
            disableColumnMenu
            disableRowSelectionOnClick
            hideFooterSelectedRowCount
            rowCount={localFeatureRows.length}
            paginationMode="client"
            sortingMode="client"
            pageNumber={paginationModel.page}
            pageSize={paginationModel.pageSize}
            pageSizeOptions={[25, 50, 75, 100]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            sx={{
              '& .MuiDataGrid-cell': {
                outline: 'none !important',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none !important',
              },
              '& .MuiDataGrid-cell:focus-within': {
                outline: 'none !important',
              },
            }}
          />
        )}
      </div>

      <MpoResetConfirmationDialog
        open={resetDialogOpen}
        onClose={closeResetDialog}
        onConfirm={resetToDefaults}
        isResetting={isResetting}
      />

      <MpoToggleConfirmationDialog
        open={toggleDialogOpen}
        featureName={pendingToggle?.featureName ?? ''}
        nextEnabled={pendingToggle?.nextEnabled ?? false}
        onClose={closeToggleDialog}
        onConfirm={confirmToggleFeature}
        isSubmitting={
          pendingToggle != null && pendingIds.has(String(pendingToggle.feature.id))
        }
      />

      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={closeNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert
          onClose={closeNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}>
          {notification.message || t('mpoConfigPage.updateError')}
        </Alert>
      </Snackbar>
    </div>
  );
};
