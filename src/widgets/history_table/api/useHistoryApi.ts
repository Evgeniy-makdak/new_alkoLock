import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useHistoryApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.EVENTS_LIST_TABLE],
    EventsApi.getHistoryList,
    { options, settings: { refetchInterval: 30000, retry: 1 } },
  );

  return { isLoading, data, refetch };
};
