import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, CircularProgress, Snackbar, Typography } from '@mui/material';

import { MobilePageHeader } from '@shared/components/mobile_page_header/MobilePageHeader';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';

import { useMpoConfigTable } from '../hooks/useMpoConfigTable';
import { FeatureSwitch } from './FeatureSwitch';
import styles from './MpoConfigTable.module.scss';
import { MpoResetConfirmationDialog } from './MpoResetConfirmationDialog';
import { MpoToggleConfirmationDialog } from './MpoToggleConfirmationDialog';

export const MpoConfigMobileTable: FC = () => {
  const { t } = useTranslation();
  const {
    isLoading,
    roleRows,
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

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <MobilePageHeader title={t('nav.mpoConfig')} />
      </div>

      <div className={styles.mobileFilters}>
        <div className={styles.mobileToolbar}>
          <Box sx={{ flex: 1 }} />
          <ResetFilters reset={openResetDialog} title={t('mpoConfigPage.resetToDefaults')} />
        </div>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: 'text.secondary', mb: 1, mt: 0.5 }}>
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
      </div>

      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 700, color: 'text.secondary', px: 2, mb: 1, mt: 1 }}>
        {t('mpoConfigPage.localParameters')}
      </Typography>

      <div className={styles.mobileList}>
        {isLoading && roleRows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          roleRows.map((row) => (
            <div key={row.id} className={styles.mobileRoleCard}>
              <h3 className={styles.mobileRoleTitle}>{row.roleLabel}</h3>
              {localFeatureRows.map((featureRow) => {
                const cell = row.cells[featureRow.featureType];
                if (!cell?.applicable) {
                  return (
                    <div key={featureRow.featureType} className={styles.mobileFeatureRow}>
                      <span className={styles.mobileFeatureLabel}>{featureRow.featureLabel}</span>
                      <span className={styles.cellEmpty}>—</span>
                    </div>
                  );
                }

                const feature = cell.feature;
                const checked = !!feature?.isEnabled;
                const disabled =
                  !feature || pendingIds.has(String(feature.id)) || isResetting;

                return (
                  <div key={featureRow.featureType} className={styles.mobileFeatureRow}>
                    <span className={styles.mobileFeatureLabel}>{featureRow.featureLabel}</span>
                    <FeatureSwitch
                      checked={checked}
                      disabled={disabled}
                      onChange={(next) => requestToggleFeature(feature, next)}
                    />
                  </div>
                );
              })}
            </div>
          ))
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
