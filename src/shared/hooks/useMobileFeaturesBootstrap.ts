import { useEffect, useRef } from 'react';

import { appStore } from '@shared/model/app_store/AppStore';
import { mobileFeaturesStore } from '@shared/model/mobile_features_store/mobileFeaturesStore';

/**
 * После авторизации подгружает mobile-features (системные, без branchId).
 */
export const useMobileFeaturesBootstrap = () => {
  const auth = appStore((s) => s.auth);
  const lastLoadedRef = useRef(false);
  const loadFeatures = mobileFeaturesStore((s) => s.loadFeatures);
  const reset = mobileFeaturesStore((s) => s.reset);

  useEffect(() => {
    if (!auth) {
      lastLoadedRef.current = false;
      reset();
      return;
    }

    if (lastLoadedRef.current) return;
    lastLoadedRef.current = true;
    void loadFeatures();
  }, [auth, loadFeatures, reset]);
};
