import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useAutoServiceInfoApi = (id: ID) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.AVTOSERVISE_EVENTS_ITEM],
    EventsApi.getEventItem,
    { options: id },
  );
  return { data, isLoading, refetch };
};
