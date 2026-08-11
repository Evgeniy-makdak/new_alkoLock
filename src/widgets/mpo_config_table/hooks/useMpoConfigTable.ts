import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';
import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useMpoConfigApi } from '../api/useMpoConfigApi';
import {
  type GlobalFeatureCell,
  getFeatureDisplayLabel,
  mapGlobalFeatures,
  mapRoleFeatureMatrix,
} from '../lib/featureMapping';

type PendingToggle = {
  feature: MobileFeature;
  nextEnabled: boolean;
  featureName: string;
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
      // Не даём ответу PUT затереть тип/подпись — иначе worker может попасть в флаги.
      featureType: data.featureType || previous.featureType,
      label: data.label || previous.label,
      featureLevel: data.featureLevel || previous.featureLevel,
      isEnabled: typeof data.isEnabled === 'boolean' ? data.isEnabled : nextEnabled,
    };
  }
  return { ...previous, isEnabled: nextEnabled };
};

export const useMpoConfigTable = () => {
  const { t } = useTranslation();
  const { branchId, features, setFeatures, upsertFeature, isLoading, error } =
    useMpoConfigApi();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);

  const globalCells: GlobalFeatureCell[] = useMemo(
    () => mapGlobalFeatures(features),
    [features],
  );

  const { roles, localFeatureRows, roleRows } = useMemo(
    () => mapRoleFeatureMatrix(features),
    [features],
  );

  const setPending = (id: ID, pending: boolean) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (pending) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const requestToggleFeature = useCallback(
    (feature: MobileFeature | null | undefined, nextEnabled: boolean) => {
      if (!feature || isResetting) return;
      setPendingToggle({
        feature,
        nextEnabled,
        featureName: getFeatureDisplayLabel(feature),
      });
      setToggleDialogOpen(true);
    },
    [isResetting],
  );

  const closeToggleDialog = useCallback(() => {
    setToggleDialogOpen(false);
    setPendingToggle(null);
  }, []);

  const confirmToggleFeature = useCallback(async () => {
    if (!pendingToggle || branchId == null) return;

    const { feature, nextEnabled } = pendingToggle;
    const snapshot = { ...feature };

    setToggleDialogOpen(false);
    setPendingToggle(null);
    setPending(feature.id, true);
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
  }, [branchId, pendingToggle, t, upsertFeature]);

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const openResetDialog = useCallback(() => {
    if (features.length === 0 || isResetting) return;
    setResetDialogOpen(true);
  }, [features.length, isResetting]);

  const closeResetDialog = useCallback(() => {
    setResetDialogOpen(false);
  }, []);

  const resetToDefaults = useCallback(async () => {
    if (!branchId || features.length === 0) return;

    const snapshot = features.map((feature) => ({ ...feature }));
    const ids = features.map((feature) => feature.id);

    setIsResetting(true);
    setResetDialogOpen(false);

    // Оптимистично: isEnabled ← defaultValue (если есть), иначе true
    setFeatures(
      features.map((feature) => ({
        ...feature,
        isEnabled: typeof feature.defaultValue === 'boolean' ? feature.defaultValue : true,
      })),
    );

    try {
      const response = await MobileFeaturesApi.resetToDefaults(branchId, ids);

      if (response?.isError) {
        throw new Error(response.message || 'reset failed');
      }

      const resetData = response?.data;
      if (Array.isArray(resetData) && resetData.length > 0) {
        setFeatures(resetData);
      } else {
        const refreshed = await MobileFeaturesApi.getList({ page: 0, size: 100 });
        if (!refreshed?.isError && Array.isArray(refreshed?.data?.content)) {
          setFeatures(refreshed.data.content);
        }
      }

      setNotification({
        open: true,
        message: t('mpoConfigPage.resetSuccess'),
        severity: 'success',
      });
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
  }, [branchId, features, setFeatures, t]);

  return {
    branchId,
    isLoading,
    error,
    roles,
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
  };
};
