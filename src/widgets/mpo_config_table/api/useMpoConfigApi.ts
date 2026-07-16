import { useEffect, useState } from 'react';

import type { MobileFeature } from '@shared/api/mobileFeaturesApi';
import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { appStore } from '@shared/model/app_store/AppStore';
import { mobileFeaturesStore } from '@shared/model/mobile_features_store/mobileFeaturesStore';
import type { ID } from '@shared/types/BaseQueryTypes';

const fetchMobileFeatures = () =>
  MobileFeaturesApi.getList({
    page: 0,
    size: 100,
  });

export const useMpoConfigApi = () => {
  const auth = appStore((state) => state.auth);
  const branchId = appStore((state) => state.selectedBranchState?.id) as ID | undefined;
  const [features, setFeaturesState] = useState<MobileFeature[]>([]);

  const { data, isLoading, error } = useConfiguredQuery(
    [QueryKeys.MOBILE_FEATURES_LIST],
    fetchMobileFeatures,
    {
      settings: {
        enabled: !!auth,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
      } as Record<string, unknown>,
    },
  );

  const setFeatures = (
    next: MobileFeature[] | ((prev: MobileFeature[]) => MobileFeature[]),
  ) => {
    setFeaturesState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      mobileFeaturesStore.getState().setFeatures(resolved);
      return resolved;
    });
  };

  useEffect(() => {
    const content = data?.data?.content;
    if (content) {
      setFeaturesState(content);
      mobileFeaturesStore.getState().setFeatures(content);
    }
  }, [data]);

  const upsertFeature = (updated: MobileFeature) => {
    setFeaturesState((prev) => {
      const id = String(updated.id);
      const exists = prev.some((item) => String(item.id) === id);
      const next = !exists
        ? [...prev, updated]
        : prev.map((item) => (String(item.id) === id ? { ...item, ...updated } : item));
      mobileFeaturesStore.getState().setFeatures(next);
      return next;
    });
  };

  const upsertFeatures = (updatedList: MobileFeature[]) => {
    if (!updatedList.length) return;
    setFeaturesState((prev) => {
      const byId = new Map(updatedList.map((item) => [String(item.id), item]));
      const next = prev.map((item) => {
        const patch = byId.get(String(item.id));
        return patch ? { ...item, ...patch } : item;
      });
      mobileFeaturesStore.getState().setFeatures(next);
      return next;
    });
  };

  return {
    branchId,
    features,
    setFeatures,
    upsertFeature,
    upsertFeatures,
    isLoading,
    error,
  };
};
