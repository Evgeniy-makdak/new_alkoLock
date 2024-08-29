import { AccountApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';

export const useAppApi = () => {
  const { data, isLoading, refetch, isSuccess, error, isError } = useConfiguredQuery(
    [QueryKeys.ACCOUNT],
    AccountApi.getAccountData,
    { triggerOnBranchChange: false },
  );

  return { user: data?.data, isLoading, refetch, isSuccess, error, isError };
};
