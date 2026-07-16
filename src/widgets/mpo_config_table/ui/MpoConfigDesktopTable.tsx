import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';
import { Typography } from '@mui/material';

import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';

import { useMpoConfigTable } from '../hooks/useMpoConfigTable';
import { useGetColumns } from '../lib/getColumns';
import { FeatureSwitch } from './FeatureSwitch';
import styles from './MpoConfigTable.module.scss';
import { MpoResetConfirmationDialog } from './MpoResetConfirmationDialog';
import { MpoToggleConfirmationDialog } from './MpoToggleConfirmationDialog';

export const MpoConfigDesktopTable: FC = () => {
  const { t } = useTranslation();
  const {
    isLoading,
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
    globalLabel,
    isResetting,
    resetDialogOpen,
    openResetDialog,
    closeResetDialog,
    resetToDefaults,
  } = useMpoConfigTable();

  const columns = useGetColumns({
    pendingIds,
    isResetting,
    onToggle: requestToggleFeature,
  });

  return (
    <div className={styles.tableWrapper}>
      <Box
        sx={{
          width: '100%',
          px: 2,
          pt: 0,
          pb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: 'text.secondary',
          }}>
          {t('mpoConfigPage.globalParameters')}
        </Typography>
        <TableHeaderEndToolbar>
          <ResetFilters
            reset={openResetDialog}
            title={t('mpoConfigPage.resetToDefaults')}
          />
        </TableHeaderEndToolbar>
      </Box>

      <div className={styles.globalToggles}>
        {globalCells.map((cell) => {
          const feature = cell.feature;
          const checked = !!feature?.isEnabled;
          const disabled =
            !feature || pendingIds.has(String(feature.id)) || isResetting;
          return (
            <FeatureSwitch
              key={cell.key}
              checked={checked}
              disabled={disabled}
              label={globalLabel(cell)}
              onChange={(next) => requestToggleFeature(feature, next)}
            />
          );
        })}
      </div>

      <Typography
        variant="subtitle2"
        sx={{
          px: 2,
          pt: 1,
          pb: 1,
          fontWeight: 700,
          color: 'text.secondary',
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
            rows={localFeatureRows}
            columns={columns}
            loading={isLoading || isResetting}
            hideFooter
            disableColumnMenu
            disableRowSelectionOnClick
            rowCount={localFeatureRows.length}
            paginationMode="client"
            sortingMode="client"
            pageNumber={0}
            pageSize={localFeatureRows.length || 2}
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
