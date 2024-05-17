import { AlcolocksApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useGroupAlcolocksTableApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ALKOLOCK_LIST_TABLE],
    AlcolocksApi.getListAlcolocks,
    { options },
  );
  return { alcolocks: data?.data, isLoading, refetch };
};
