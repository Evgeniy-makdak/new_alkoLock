import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';

import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';

import { useMpoConfigTable } from '../hooks/useMpoConfigTable';
import { useGetColumns } from '../lib/getColumns';
import { FeatureSwitch } from './FeatureSwitch';
import styles from './MpoConfigTable.module.scss';
import { MpoResetConfirmationDialog } from './MpoResetConfirmationDialog';

export const MpoConfigDesktopTable: FC = () => {
  const { t } = useTranslation();
  const {
    isLoading,
    rows,
    globalCells,
    pendingIds,
    notification,
    closeNotification,
    toggleFeature,
    featureColumnLabel,
    globalLabel,
    isResetting,
    resetDialogOpen,
    openResetDialog,
    closeResetDialog,
    resetToDefaults,
  } = useMpoConfigTable();

  const columns = useGetColumns({
    featureColumnLabel,
    pendingIds,
    isResetting,
    onToggle: toggleFeature,
  });

  return (
    <div className={styles.tableWrapper}>
      <TableHeaderWrapper>
        <Box sx={{ flex: 1 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <TableHeaderEndToolbar>
            <ResetFilters
              reset={openResetDialog}
              title={t('mpoConfigPage.resetToDefaults')}
            />
          </TableHeaderEndToolbar>
        </div>
      </TableHeaderWrapper>

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
              onChange={(next) => toggleFeature(feature, next)}
            />
          );
        })}
      </div>

      <div className={styles.scrollableTable}>
        {isLoading && rows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table
            rows={rows}
            columns={columns}
            loading={isLoading || isResetting}
            hideFooter
            disableColumnMenu
            disableRowSelectionOnClick
            rowCount={rows.length}
            paginationMode="client"
            sortingMode="client"
            pageNumber={0}
            pageSize={rows.length || 2}
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
