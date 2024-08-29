import { AlcolocksApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useAlkolocksApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ALKOLOCK_LIST_TABLE],
    AlcolocksApi.getListAlcolocks,
    { options, settings: { refetchInterval: 30000 } },
  );
  return { data: data?.data, isLoading, refetch };
};
