import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useMarksCarQuery = (options?: QueryOptions) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.MARKS_CAR], CarsApi.getMarksCarList, {
    options,
  });
  return { data, isLoading };
};
