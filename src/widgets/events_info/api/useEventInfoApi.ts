import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useEventInfoApi = (id: ID) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.EVENTS_ITEM], EventsApi.getEventItem, {
    options: id,
  });
  return { data, isLoading };
};
