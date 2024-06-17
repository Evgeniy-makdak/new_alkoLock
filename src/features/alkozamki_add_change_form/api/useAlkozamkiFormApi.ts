import { AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';

import { AlcolocksApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { CreateAlcolockData, ID, IError } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [
  QueryKeys.ALCOLOCK_LIST,
  QueryKeys.ALKOLOCK_ITEM,
  QueryKeys.ALKOLOCK_LIST_TABLE,
];

const messageCode: { [key: number]: string } = {
  [StatusCode.CONFLICT]: 'Алкозамок с данным серийным номером уже существует',
};

const onError = (error: AxiosError<IError>) => {
  const status = error?.response?.data?.status || error?.response?.status;
  const message = messageCode[status] || 'Произошла ошибка. Попробуйте еще раз.';
  if (message) {
    enqueueSnackbar(message, { variant: 'error' });
  }
};

export const useAlkozamkiFormApi = (id?: ID) => {
  const update = useUpdateQueries();

  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.ALKOLOCK_ITEM],
    AlcolocksApi.getAlkolock,
    { options: id, settings: { enabled: !!id } },
  );

  const handleError = (e: unknown) => {
    if (e instanceof AxiosError) {
      onError(e);
    }
    throw e; // Ensure error is propagated
  };

  const { mutateAsync: changeItem } = useMutation({
    mutationFn: async (changeData: CreateAlcolockData) => {
      const response = await AlcolocksApi.changeItem(changeData, id);
      if (response.status >= 400) {
        throw new AxiosError(
          `Request failed with status code ${response.status}`,
          undefined,
          response.config,
          response.request,
          response,
        );
      }
      return response;
    },
    onSuccess: () => {
      update(updateQueries);
    },
    onError: handleError,
  });

  const { mutateAsync: createItem } = useMutation({
    mutationFn: async (changeData: CreateAlcolockData) => {
      const response = await AlcolocksApi.createItem(changeData);
      if (response.status >= 400) {
        throw new AxiosError(
          `Request failed with status code ${response.status}`,
          undefined,
          response.config,
          response.request,
          response,
        );
      }
      return response;
    },
    onSuccess: () => {
      update(updateQueries);
    },
    onError: handleError,
  });

  return { alkolock: data?.data, isLoadingAlkolock: isLoading, changeItem, createItem };
};
