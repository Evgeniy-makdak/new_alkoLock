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

const mergePutResponse = (
  previous: MobileFeature,
  responseData: unknown,
  nextEnabled: boolean,
): MobileFeature => {
  if (responseData && typeof responseData === 'object') {
    const data = responseData as Partial<MobileFeature>;
    return {
      ...previous,
      ...data,
      isEnabled: typeof data.isEnabled === 'boolean' ? data.isEnabled : nextEnabled,
    };
  }
  return { ...previous, isEnabled: nextEnabled };
};

export const useMpoConfigTable = () => {
  const { t } = useTranslation();
  const { branchId, features, setFeatures, upsertFeature, upsertFeatures, isLoading, error } =
    useMpoConfigApi();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

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

  const globalCells: GlobalFeatureCell[] = useMemo(
    () => mapGlobalFeatures(features),
    [features],
  );

  const matrixCells = useMemo(() => mapRoleFeatureMatrix(features), [features]);

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

      const snapshot = { ...feature };
      setPending(feature.id, true);
      // оптимистичное обновление — без повторного GET
      upsertFeature({ ...feature, isEnabled: nextEnabled });

      try {
        const response = await MobileFeaturesApi.updateFeature(feature.id, {
          branchId,
          isEnabled: nextEnabled,
        });

        if (response?.isError) {
          throw new Error(response.message || 'update failed');
        }

        upsertFeature(mergePutResponse(snapshot, response?.data as unknown, nextEnabled));
      } catch {
        upsertFeature(snapshot);
        setNotification({
          open: true,
          message: t('mpoConfigPage.updateError'),
          severity: 'error',
        });
      } finally {
        setPending(feature.id, false);
      }
    },
    [branchId, t, upsertFeature],
  );

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const openResetDialog = useCallback(() => {
    if (!branchId || features.length === 0 || isResetting) return;
    setResetDialogOpen(true);
  }, [branchId, features.length, isResetting]);

  const closeResetDialog = useCallback(() => {
    setResetDialogOpen(false);
  }, []);

  const resetToDefaults = useCallback(async () => {
    if (!branchId || features.length === 0) return;

    const snapshot = features.map((feature) => ({ ...feature }));
    const toEnable = features.filter((feature) => !feature.isEnabled);

    setIsResetting(true);
    setResetDialogOpen(false);

    // все параметры → isEnabled: true (оптимистично)
    setFeatures(features.map((feature) => ({ ...feature, isEnabled: true })));

    if (toEnable.length === 0) {
      setIsResetting(false);
      setNotification({
        open: true,
        message: t('mpoConfigPage.resetSuccess'),
        severity: 'success',
      });
      return;
    }

    try {
      const results = await Promise.all(
        toEnable.map((feature) =>
          MobileFeaturesApi.updateFeature(feature.id, {
            branchId,
            isEnabled: true,
          }).then((response) => ({ feature, response })),
        ),
      );

      const failed = results.filter(({ response }) => response?.isError);
      if (failed.length === results.length) {
        throw new Error('all resets failed');
      }

      const updated: MobileFeature[] = results
        .filter(({ response }) => !response?.isError)
        .map(({ feature, response }) =>
          mergePutResponse(feature, response?.data as unknown, true),
        );

      upsertFeatures(updated);

      if (failed.length > 0) {
        // частичный откат неудачных
        const failedIds = new Set(failed.map(({ feature }) => String(feature.id)));
        setFeatures((prev) =>
          prev.map((item) => {
            if (!failedIds.has(String(item.id))) return item;
            const original = snapshot.find((s) => String(s.id) === String(item.id));
            return original ?? item;
          }),
        );
        setNotification({
          open: true,
          message: t('mpoConfigPage.resetError'),
          severity: 'error',
        });
      } else {
        setNotification({
          open: true,
          message: t('mpoConfigPage.resetSuccess'),
          severity: 'success',
        });
      }
    } catch {
      setFeatures(snapshot);
      setNotification({
        open: true,
        message: t('mpoConfigPage.resetError'),
        severity: 'error',
      });
    } finally {
      setIsResetting(false);
    }
  }, [branchId, features, setFeatures, t, upsertFeatures]);

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
    isResetting,
    resetDialogOpen,
    openResetDialog,
    closeResetDialog,
    resetToDefaults,
  };
};
