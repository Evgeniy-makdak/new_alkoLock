import { type AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';

import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { AccountApi, UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { IAuthenticate, IError, UserDataLogin } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const useAuthApi = (
  isSuccessLogin: boolean,
  onSuccess: (data: AppAxiosResponse<IAuthenticate>) => void,
) => {
  const {
    isPending,
    mutate,
    isError,
    isSuccess,
    data: loginData,
  } = useMutation({
    mutationFn: (data: UserDataLogin) => UsersApi.authenticate(data),
    onError(error: AxiosError<IError>) {
      console.log(error);

      enqueueSnackbar(`${error?.response?.data?.detail} ${error?.response?.data.status}`, {
        variant: 'error',
      });
    },
    onSuccess: (data) => onSuccess(data),
  });

  const {
    data: accountResponse,
    isLoading,
    isPlaceholderData,
    isFetching,
    isFetched,
    isRefetching,

    isSuccess: isSuccessGetAccountData,
  } = useConfiguredQuery([QueryKeys.ACCOUNT], AccountApi.getAccountData, {
    settings: {
      enabled: isSuccessLogin,
    },
  });

  const canEnter = !isFetching && isFetched && !isRefetching;
  return {
    mutate,
    isLoading: isPending || isLoading,
    accountData: accountResponse?.data,
    isError,
    isSuccess,
    isSuccessGetAccountData,
    isPlaceholderData,
    loginData,
    canEnter,
  };
};
