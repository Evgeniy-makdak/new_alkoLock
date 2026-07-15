import { useEffect, useRef } from 'react';

import { appStore } from '@shared/model/app_store/AppStore';
import { mobileFeaturesStore } from '@shared/model/mobile_features_store/mobileFeaturesStore';
import type { ID } from '@shared/types/BaseQueryTypes';

/**
 * После авторизации / при смене филиала подгружает mobile-features
 * (сразу после api/account, когда известен branchId).
 */
export const useMobileFeaturesBootstrap = () => {
  const auth = appStore((s) => s.auth);
  const selectedBranchId = appStore((s) => s.selectedBranchState?.id) as ID | undefined;
  const assignmentBranchId = appStore((s) => s.assignmentBranch?.id) as ID | undefined;
  const isAdmin = appStore((s) => s.isAdmin);

  const branchId = selectedBranchId ?? (!isAdmin ? assignmentBranchId : undefined);
  const lastLoadedRef = useRef<string | null>(null);
  const loadForBranch = mobileFeaturesStore((s) => s.loadForBranch);
  const reset = mobileFeaturesStore((s) => s.reset);

  useEffect(() => {
    if (!auth) {
      lastLoadedRef.current = null;
      reset();
      return;
    }

    if (branchId == null || branchId === '') return;

    const key = String(branchId);
    if (lastLoadedRef.current === key) return;
    lastLoadedRef.current = key;
    void loadForBranch(branchId);
  }, [auth, branchId, loadForBranch, reset]);
};
