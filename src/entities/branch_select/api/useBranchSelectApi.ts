import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useBranchSelectApi = (options?: QueryOptions) => {
  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.BRANCH_LIST_SELECT],
    BranchApi.getBranchList,
    { options },
  );

  return { branch: data?.data, isLoading };
};
