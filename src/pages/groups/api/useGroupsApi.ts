/* eslint-disable @typescript-eslint/no-explicit-any */
import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useGroupsApi = (id: ID | null) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.BRANCH_ITEM],
    BranchApi.getBranch,
    { options: id, settings: { enabled: !!id } as any },
  );

  return { branch: data?.data, isLoading, refetch };
};
