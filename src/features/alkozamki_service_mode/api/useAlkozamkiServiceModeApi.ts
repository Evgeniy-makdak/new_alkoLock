import type { AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';

import { EventsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ActivateServiceModeOptions, ID, IError } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const messageCode: { [key: number]: string } = {
  [StatusCode.NOT_FOUND]: 'Такого события уже нет',
  [StatusCode.UNAUTHORIZED]: 'Вы не авторизованы',
};

const onError = (error: AxiosError<IError>) => {
  const status = error?.response?.data?.status || error?.response?.status;
  const message = messageCode[status];

  if (!message) return;
  enqueueSnackbar({ message: message, variant: 'error' });
};

const updateQueries = [
  QueryKeys.AVTOSERVISE_EVENTS_ITEM,
  QueryKeys.AUTO_SERVICE_EVENTS_LIST,
  QueryKeys.ALCOLOCK_LIST,
  QueryKeys.ALKOLOCK_ITEM,
  QueryKeys.ALKOLOCK_LIST_TABLE,
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useAlkozamkiServiceModeApi = () => {
  const update = useUpdateQueries();
  const { mutate: cancelMutation } = useMutation({
    mutationFn: (id: ID) => {
      return EventsApi.cancelActivateService(id);
    },
    onError: onError,
    onSuccess: () => update(updateQueries),
  });

  const { mutate: activateServiceModeMutation, isPending: isLoadingActivateServiceModeMutation } =
    useMutation({
      mutationFn: (options: ActivateServiceModeOptions) => {
        return EventsApi.activateServiceMode(options);
      },
      onError: onError,
      onSuccess: () => update(updateQueries),
    });

  const { mutate: rejectActivateServiceMutate } = useMutation({
    mutationFn: (id: ID) => {
      return EventsApi.rejectActivateService(id);
    },
    onError: onError,
    onSuccess: () => update(updateQueries),
  });

  const { mutate: seenMutate } = useMutation({
    mutationKey: [],
    mutationFn: (id: ID) => {
      return EventsApi.rejectActivateService(id);
    },
    onError: onError,
    onSuccess: () => update(updateQueries),
  });

  const { mutate: acceptActivateServiceMutate } = useMutation({
    mutationKey: [],
    mutationFn: (id: ID) => {
      return EventsApi.acceptActivateService(id);
    },
    onError: onError,
    onSuccess: () => update(updateQueries),
  });
  return {
    cancelMutation,
    activateServiceModeMutation,
    rejectActivateServiceMutate,
    seenMutate,
    acceptActivateServiceMutate,
    isLoadingActivateServiceModeMutation,
  };
};
