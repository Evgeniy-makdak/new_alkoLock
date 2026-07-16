/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { type GridColDef } from '@mui/x-data-grid';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';

import { type MpoRoleKey, MPO_ROLE_ORDER } from '../lib/featureMapping';
import type { MpoConfigLocalFeatureRow } from '../hooks/useMpoConfigTable';
import { FeatureSwitch } from '../ui/FeatureSwitch';
import styles from '../ui/MpoConfigTable.module.scss';

type UseGetColumnsParams = {
  pendingIds: Set<string>;
  isResetting?: boolean;
  onToggle: (feature: MobileFeature | null | undefined, nextEnabled: boolean) => void;
};

export const useGetColumns = ({
  pendingIds,
  isResetting = false,
  onToggle,
}: UseGetColumnsParams): GridColDef<MpoConfigLocalFeatureRow>[] => {
  const { t } = useTranslation();

  return useMemo(() => {
    const featureNameColumn: GridColDef<MpoConfigLocalFeatureRow> = {
      field: 'featureLabel',
      headerName: '',
      width: 260,
      sortable: false,
      filterable: false,
      renderCell: (params) => <span>{params.row.featureLabel}</span>,
    };

    const roleColumns: GridColDef<MpoConfigLocalFeatureRow>[] = MPO_ROLE_ORDER.map((roleKey) => ({
      field: roleKey,
      headerName:
        roleKey === 'driver' ? t('mpoConfigPage.driver') : t('mpoConfigPage.serviceWorker'),
      minWidth: 180,
      flex: 1,
      sortable: false,
      filterable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => {
        const cell = params.row.cells[roleKey as MpoRoleKey];
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
    }));

    return [featureNameColumn, ...roleColumns];
  }, [isResetting, onToggle, pendingIds, t]);
};
