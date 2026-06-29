import { AccountApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { getBearerToken } from '@shared/utils/cookie_manager';

export const useAppApi = () => {
  const hasValidBearer = Boolean(getBearerToken());

  const { data, isLoading, refetch, isSuccess, error, isError } = useConfiguredQuery(
    [QueryKeys.ACCOUNT],
    AccountApi.getAccountData,
    {
      triggerOnBranchChange: false,
      settings: { enabled: hasValidBearer },
    },
  );

  return { user: data?.data, isLoading, refetch, isSuccess, error, isError };
};
