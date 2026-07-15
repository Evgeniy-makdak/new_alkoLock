import { useMemo } from 'react';

import { MobileFeaturesApi } from '@shared/api/mobileFeaturesApi';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';

const fetchMobileFeatures = (options?: QueryOptions | ID) => {
  const branchId =
    typeof options === 'object' && options && 'filterOptions' in options
      ? (options.filterOptions?.branchId as ID)
      : (options as ID);

  return MobileFeaturesApi.getList({
    branchId,
    page: 0,
    size: 100,
  });
};

export const useMpoConfigApi = () => {
  const branchId = appStore((state) => state.selectedBranchState?.id) as ID | undefined;

  const { data, isLoading, isFetching, refetch, error } = useConfiguredQuery(
    [QueryKeys.MOBILE_FEATURES_LIST],
    fetchMobileFeatures,
    {
      options: {
        filterOptions: { branchId },
      },
      settings: {
        enabled: !!branchId,
      },
    },
  );

  const features = useMemo(() => data?.data?.content ?? [], [data]);

  return {
    branchId,
    features,
    isLoading: isLoading || isFetching,
    refetch,
    error,
  };
};
