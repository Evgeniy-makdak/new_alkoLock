import { CarsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useVehiclesInfoApi = (id: ID) => {
  const {
    data: carResponse,
    isLoading,
    error,
  } = useConfiguredQuery([QueryKeys.CAR_ITEM], CarsApi.getCar, {
    options: id,
  });
  const notFoundCar =
    error?.status === StatusCode.NOT_FOUND || carResponse?.status === StatusCode.NOT_FOUND;
  return { car: carResponse?.data, isLoading, notFoundCar };
};
