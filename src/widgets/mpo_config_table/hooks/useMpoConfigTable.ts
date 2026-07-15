import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';
import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useMpoConfigApi } from '../api/useMpoConfigApi';
import {
  type GlobalFeatureCell,
  mapGlobalFeatures,
  mapRoleFeatureMatrix,
  MpoGlobalFeatureKey,
  MpoRoleFeatureKey,
  MpoRoleKey,
  MPO_ROLE_FEATURE_ORDER,
  MPO_ROLE_ORDER,
  type RoleFeatureCell,
} from '../lib/featureMapping';

export type MpoConfigRow = {
  id: MpoRoleKey;
  roleKey: MpoRoleKey;
  roleLabel: string;
  cells: Record<MpoRoleFeatureKey, RoleFeatureCell>;
};

export const useMpoConfigTable = () => {
  const { t } = useTranslation();
  const { branchId, features, isLoading, refetch, error } = useMpoConfigApi();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const roleLabel = useCallback(
    (roleKey: MpoRoleKey) =>
      roleKey === MpoRoleKey.DRIVER
        ? t('mpoConfigPage.driver')
        : t('mpoConfigPage.serviceWorker'),
    [t],
  );

  const featureColumnLabel = useCallback(
    (featureKey: MpoRoleFeatureKey) => t(`mpoConfigPage.${featureKey}`),
    [t],
  );

  const globalLabel = useCallback(
    (cell: GlobalFeatureCell) => {
      // Предпочитаем label с бэка; для одинаковых «Заявки...» уточняем по featureType
      if (cell.feature?.label) {
        if (
          cell.key === MpoGlobalFeatureKey.SERVICE_MODE_DRIVER ||
          cell.key === MpoGlobalFeatureKey.SERVICE_MODE_SERVICE_WORKER
        ) {
          return t(`mpoConfigPage.${cell.key}`);
        }
        return cell.feature.label;
      }
      return t(`mpoConfigPage.${cell.key}`);
    },
    [t],
  );

  const effectiveFeatures = useMemo(() => {
    return features.map((feature) => {
      const override = localOverrides[String(feature.id)];
      if (override === undefined) return feature;
      return { ...feature, isEnabled: override };
    });
  }, [features, localOverrides]);

  const globalCells: GlobalFeatureCell[] = useMemo(
    () => mapGlobalFeatures(effectiveFeatures),
    [effectiveFeatures],
  );

  const matrixCells = useMemo(
    () => mapRoleFeatureMatrix(effectiveFeatures),
    [effectiveFeatures],
  );

  const rows: MpoConfigRow[] = useMemo(() => {
    return MPO_ROLE_ORDER.map((roleKey) => {
      const cells = {} as Record<MpoRoleFeatureKey, RoleFeatureCell>;
      for (const featureKey of MPO_ROLE_FEATURE_ORDER) {
        cells[featureKey] =
          matrixCells.find((c) => c.roleKey === roleKey && c.featureKey === featureKey) ?? {
            roleKey,
            featureKey,
            feature: null,
            applicable: false,
          };
      }
      return {
        id: roleKey,
        roleKey,
        roleLabel: roleLabel(roleKey),
        cells,
      };
    });
  }, [matrixCells, roleLabel]);

  const setPending = (id: ID, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleFeature = useCallback(
    async (feature: MobileFeature | null | undefined, nextEnabled: boolean) => {
      if (!feature || branchId == null) return;

      const idKey = String(feature.id);
      const prevEnabled = feature.isEnabled;

      setLocalOverrides((prev) => ({ ...prev, [idKey]: nextEnabled }));
      setPending(feature.id, true);

      try {
        const response = await MobileFeaturesApi.updateFeature(feature.id, {
          branchId,
          isEnabled: nextEnabled,
        });

        if (response?.isError) {
          throw new Error(response.message || 'update failed');
        }

        await refetch();
        setLocalOverrides((prev) => {
          const next = { ...prev };
          delete next[idKey];
          return next;
        });
      } catch {
        setLocalOverrides((prev) => ({ ...prev, [idKey]: prevEnabled }));
        setNotification({
          open: true,
          message: t('mpoConfigPage.updateError'),
          severity: 'error',
        });
      } finally {
        setPending(feature.id, false);
      }
    },
    [branchId, refetch, t],
  );

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  return {
    branchId,
    isLoading,
    error,
    rows,
    globalCells,
    pendingIds,
    notification,
    closeNotification,
    toggleFeature,
    roleLabel,
    featureColumnLabel,
    globalLabel,
    featureColumns: MPO_ROLE_FEATURE_ORDER,
  };
};
