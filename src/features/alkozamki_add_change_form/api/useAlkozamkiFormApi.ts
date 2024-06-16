import { AxiosError } from 'axios';
import { useSnackbar } from 'notistack';

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

export const useAlkozamkiFormApi = (id?: ID, onSuccessCallback?: () => void) => {
  const { enqueueSnackbar } = useSnackbar();
  const update = useUpdateQueries();

  const onError = (error: AxiosError<IError>) => {
    const status = error?.response?.data?.status || error?.response?.status;
    const message = messageCode[status] || 'Произошла ошибка. Попробуйте еще раз.';
    if (message) {
      enqueueSnackbar(message, { variant: 'error' });
    }
  };

  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.ALKOLOCK_ITEM],
    AlcolocksApi.getAlkolock,
    { options: id, settings: { enabled: !!id } },
  );

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
    onError,
    onSuccess: () => {
      update(updateQueries);
      if (onSuccessCallback) onSuccessCallback();
    },
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
    onError,
    onSuccess: () => {
      update(updateQueries);
      if (onSuccessCallback) onSuccessCallback();
    },
  });

  return { alkolock: data?.data, isLoadingAlkolock: isLoading, changeItem, createItem };
};
