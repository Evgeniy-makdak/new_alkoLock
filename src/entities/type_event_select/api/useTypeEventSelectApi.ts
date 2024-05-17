import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';

export const useTypeEventSelectApi = () => {
  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.EVENTS_TYPE_LIST],
    EventsApi.getEventsTypeList,
    {},
  );

  return { events: data?.data, isLoading, isError: data?.isError };
};
