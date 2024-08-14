import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';

export const useUserDataApi = () => {
  const { data: branchListResponse, isLoading: isLoadingBranchList } = useConfiguredQuery(
    [QueryKeys.BRANCH_LIST_SELECT],
    BranchApi.getBranchList,
    {
      settings: {
        networkMode: 'offlineFirst',
      },
    },
  );

  return {
    isLoading: isLoadingBranchList,
    branchList: branchListResponse?.data?.content,
  };
};
