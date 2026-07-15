import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Alert, Box, CircularProgress, Snackbar } from '@mui/material';

import { MobilePageHeader } from '@shared/components/mobile_page_header/MobilePageHeader';

import { useMpoConfigTable } from '../hooks/useMpoConfigTable';
import { MPO_ROLE_FEATURE_ORDER } from '../lib/featureMapping';
import { FeatureSwitch } from './FeatureSwitch';
import styles from './MpoConfigTable.module.scss';

export const MpoConfigMobileTable: FC = () => {
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

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <MobilePageHeader title={t('nav.mpoConfig')} />
      </div>

      <div className={styles.mobileFilters}>
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
      </div>

      <div className={styles.mobileList}>
        {isLoading && rows.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          rows.map((row) => (
            <div key={row.id} className={styles.mobileRoleCard}>
              <h3 className={styles.mobileRoleTitle}>{row.roleLabel}</h3>
              {MPO_ROLE_FEATURE_ORDER.map((featureKey) => {
                const cell = row.cells[featureKey];
                if (!cell?.applicable) return null;

                const feature = cell.feature;
                const checked = !!feature?.isEnabled;
                const disabled = !feature || pendingIds.has(String(feature.id));

                return (
                  <div key={featureKey} className={styles.mobileFeatureRow}>
                    <span className={styles.mobileFeatureLabel}>
                      {featureColumnLabel(featureKey)}
                    </span>
                    <FeatureSwitch
                      checked={checked}
                      disabled={disabled}
                      onChange={(next) => toggleFeature(feature, next)}
                    />
                  </div>
                );
              })}
            </div>
          ))
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
