import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';

import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';

import { useMpoConfigTable } from '../hooks/useMpoConfigTable';
import { useGetColumns } from '../lib/getColumns';
import { FeatureSwitch } from './FeatureSwitch';
import styles from './MpoConfigTable.module.scss';

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
  } = useMpoConfigTable();

  const columns = useGetColumns({
    featureColumnLabel,
    pendingIds,
    onToggle: toggleFeature,
  });

  return (
    <div className={styles.tableWrapper}>
      <TableHeaderWrapper>
        <Box sx={{ flex: 1 }} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <TableHeaderEndToolbar />
        </div>
      </TableHeaderWrapper>

      <div className={styles.globalToggles}>
        {globalCells.map((cell) => {
          const feature = cell.feature;
          const checked = !!feature?.isEnabled;
          const disabled = !feature || pendingIds.has(String(feature.id));
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
            loading={isLoading}
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
