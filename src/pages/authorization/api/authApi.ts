/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { AccountApi, UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { getBearerToken } from '@shared/utils/cookie_manager';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { IAuthenticate, UserDataLogin } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const useAuthApi = (
  authSuccess: boolean,
  onAuthSuccess: (data: AppAxiosResponse<IAuthenticate>) => void,
) => {
  const {
    isPending: isAuthPending,
    mutate,
    isError: isAuthError,
    isSuccess: isAuthSuccess,
    data: authData,
  } = useMutation({
    mutationFn: (data: UserDataLogin) => UsersApi.authenticate(data),
    onSuccess: onAuthSuccess,
  });

  const hasValidBearer = Boolean(getBearerToken());

  const {
    data: accountResponse,
    isLoading: isAccountLoading,
    isPlaceholderData,
    isSuccess: isSuccessGetAccountData,
  } = useConfiguredQuery([QueryKeys.ACCOUNT], AccountApi.getAccountData, {
    settings: {
      enabled: authSuccess && hasValidBearer,
    } as any,
  });

  return {
    mutate,
    isLoading: isAuthPending || isAccountLoading,
    accountData: accountResponse?.data,
    isError: isAuthError,
    isSuccess: isAuthSuccess,
    isSuccessGetAccountData,
    isPlaceholderData,
    authData,
  };
};
