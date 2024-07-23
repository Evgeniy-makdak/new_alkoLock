import { AlcolocksApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useAlcolockListQuery = (options: QueryOptions) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.ALCOLOCK_LIST], AlcolocksApi.getList, {
    options,
  });

  return { alcolocks: data?.data || [], isLoading };
};
