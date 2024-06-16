import { AxiosError } from 'axios';
import { enqueueSnackbar } from 'notistack';

import { CarsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ChangeCarBody, CreateCarBody, ID, IError } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.VEHICLES_PAGE_TABLE, QueryKeys.CAR_LIST, QueryKeys.CAR_ITEM];

const messageCode: { [key: number]: string } = {
  [StatusCode.CONFLICT]: 'ТС уже зарегистрировано в системе. Обратитесь к администратору',
};

const onError = (error: AxiosError<IError>) => {
  const status = error?.response?.data?.status || error?.response?.status;
  const message = messageCode[status];
  if (message) {
    enqueueSnackbar({ message, variant: 'error' });
  }
};

export const useCarAddChangeFormApi = (id?: ID) => {
  const update = useUpdateQueries();

  const { data, isLoading } = useConfiguredQuery([QueryKeys.CAR_ITEM], CarsApi.getCar, {
    options: id,
    settings: {
      enabled: !!id,
    },
  });

  const { mutateAsync: changeItem } = useMutation({
    mutationFn: async (changeData: ChangeCarBody) => {
      try {
        const response = await CarsApi.changeCar(changeData, id);
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
      } catch (e) {
        if (e instanceof AxiosError) {
          onError(e);
        }
        throw e; // Убедимся, что ошибка всё ещё выбрасывается
      }
    },
    onSuccess: () => {
      update(updateQueries);
    },
  });

  const { mutateAsync: createItem } = useMutation({
    mutationFn: async (changeData: CreateCarBody) => {
      try {
        const response = await CarsApi.createCar(changeData);
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
      } catch (e) {
        if (e instanceof AxiosError) {
          onError(e);
        }
        throw e; // Убедимся, что ошибка всё ещё выбрасывается
      }
    },
    onSuccess: () => {
      update(updateQueries);
    },
  });

  return { car: data?.data, isLoadingCar: isLoading, changeItem, createItem };
};
