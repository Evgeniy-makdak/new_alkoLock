import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useCarListQuery = (
  options: QueryOptions & { isAttachment?: boolean },
  includeIsActive = false,
) => {
  const queryOptions = includeIsActive ? { ...options, isActive: true } : options;

  const { data, isLoading } = useConfiguredQuery([QueryKeys.CAR_LIST], CarsApi.getCarsList, {
    options: queryOptions,
  });

  return { carList: data?.data?.content || [], isLoading };
};
