import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { QueryOptions } from '@shared/types/QueryTypes';

const delayedGetBranchList = async (options: QueryOptions) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return BranchApi.getBranchList(options);
};

export const useUserDataApi = () => {
  const { data: branchListResponse, isLoading: isLoadingBranchList } = useConfiguredQuery(
    [QueryKeys.BRANCH_LIST_SELECT],
    delayedGetBranchList, 
    {
      settings: {
        networkMode: 'offlineFirst',
      },
      options: {
        staleTime: Infinity,
      },
    },
  );

  return {
    isLoading: isLoadingBranchList,
    branchList: branchListResponse?.data?.content,
  };
};
