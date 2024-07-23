import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useGroupTableApi = (options?: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.BRANCH_LIST_TABLE],
    BranchApi.getBranchList,
    { options },
  );

  return { branchs: data?.data, isLoading, refetch };
};
