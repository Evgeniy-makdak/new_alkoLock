/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';

import { AlcolocksApi } from '@shared/api/baseQuerys';
import { AttachmentsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type {
  AttachmentsCreateData,
  CreateAlcolockData,
  ID,
  IError,
} from '@shared/types/BaseQueryTypes';
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
  const status = error?.response?.status;
  // @ts-expect-error: временное решение
  const errorData = error?.response?.detail;

  let message: string | undefined;

  // Обработка JHipster-style ошибок (400 статус)
  if (status === StatusCode.BAD_REQUEST && errorData) {
    message = errorData;
  }
  // Обработка конфликтов и других специфичных ошибок
  else if (status && messageCode[status]) {
    message = messageCode[status];
  }
  // Общий случай
  else {
    message = errorData;
  }

  if (message) {
    enqueueSnackbar(message, { variant: 'error' });
  }
};

export const useAlkozamkiFormApi = (id?: ID) => {
  const update = useUpdateQueries();

  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.ALKOLOCK_ITEM],
    AlcolocksApi.getAlkolock,
    { options: id, settings: { enabled: !!id } as any },
  );

  const handleError = (e: unknown) => {
    if (e instanceof AxiosError) {
      onError(e);
    }
    throw e;
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

  const getAttachmentsByVehicle = {
    fetch: async (vehicleId: ID, branchId?: ID) => {
      try {
        // Сначала получаем первую страницу чтобы узнать totalElements
        const firstPage = await AttachmentsApi.getList({
          vehicleId: vehicleId,
          page: 0,
          limit: 20,
          filterOptions: {
            branchId: branchId,
          },
        });

        if (!firstPage?.data?.totalElements) {
          return firstPage?.data?.content || [];
        }

        const totalElements = firstPage.data.totalElements;

        if (totalElements <= 20) {
          return firstPage.data.content || [];
        }

        const allResponse = await AttachmentsApi.getList({
          vehicleId: vehicleId,
          page: 0,
          limit: totalElements,
          filterOptions: {
            branchId: branchId,
          },
        });

        return allResponse?.data?.content || [];
      } catch (error) {
        // console.error('Error fetching attachments:', error);
        return [];
      }
    },
    createAttachment: async (data: AttachmentsCreateData) => {
      const response = await AttachmentsApi.createItem(data);
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
  };

  return {
    alkolock: data?.data,
    isLoadingAlkolock: isLoading,
    changeItem,
    createItem,
    getAttachmentsByVehicle,
  };
};
