import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useCarListQuery = (options: QueryOptions) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.CAR_LIST], CarsApi.getCarsList, {
    options,
  });
  return { carList: data?.data || [], isLoading };
};
