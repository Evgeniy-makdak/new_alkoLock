import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useVehiclesTableApi = (options: QueryOptions) => {
  const { data, refetch, isLoading } = useConfiguredQuery(
    [QueryKeys.VEHICLES_PAGE_TABLE],
    CarsApi.getCarsList,
    { options },
  );
  return { cars: data?.data, isLoading, refetch };
};
