/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type GridColDef } from '@mui/x-data-grid';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';

import {
  type MpoRoleFeatureKey,
  MPO_ROLE_FEATURE_ORDER,
} from '../lib/featureMapping';
import type { MpoConfigRow } from '../hooks/useMpoConfigTable';
import { FeatureSwitch } from '../ui/FeatureSwitch';
import styles from '../ui/MpoConfigTable.module.scss';

type UseGetColumnsParams = {
  featureColumnLabel: (key: MpoRoleFeatureKey) => string;
  pendingIds: Set<string>;
  isResetting?: boolean;
  onToggle: (feature: MobileFeature | null | undefined, nextEnabled: boolean) => void;
};

export const useGetColumns = ({
  featureColumnLabel,
  pendingIds,
  isResetting = false,
  onToggle,
}: UseGetColumnsParams): GridColDef<MpoConfigRow>[] => {
  const { t } = useTranslation();

  return useMemo(() => {
    const roleColumn: GridColDef<MpoConfigRow> = {
      field: 'roleLabel',
      headerName: t('mpoConfigPage.role'),
      width: 200,
      sortable: false,
      filterable: false,
    };

    const featureColumns: GridColDef<MpoConfigRow>[] = MPO_ROLE_FEATURE_ORDER.map(
      (featureKey) => ({
        field: featureKey,
        headerName: featureColumnLabel(featureKey),
        minWidth: 180,
        flex: 1,
        sortable: false,
        filterable: false,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params) => {
          const cell = params.row.cells[featureKey];
          if (!cell?.applicable) {
            return <span className={styles.cellEmpty}>—</span>;
          }

          const feature = cell.feature;
          const checked = !!feature?.isEnabled;
          const disabled = !feature || isResetting || pendingIds.has(String(feature.id));

          return (
            <FeatureSwitch
              checked={checked}
              disabled={disabled}
              onChange={(next: boolean) => onToggle(feature, next)}
            />
          );
        },
      }),
    );

    return [roleColumn, ...featureColumns];
  }, [featureColumnLabel, isResetting, onToggle, pendingIds, t]);
};
