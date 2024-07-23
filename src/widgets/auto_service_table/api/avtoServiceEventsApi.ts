import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useAvtoServiceEventsApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.AUTO_SERVICE_EVENTS_LIST],
    EventsApi.getEventListForAutoService,
    { options },
  );
  return { data, isLoading, refetch };
};
