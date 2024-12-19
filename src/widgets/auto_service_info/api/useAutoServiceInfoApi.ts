import { EventsApi } from '@shared/api/baseQuerys'; 
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useEffect } from 'react';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useAutoServiceInfoApi = (id: ID) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.AVTOSERVISE_EVENTS_ITEM],
    EventsApi.getEventItemForAutoServise,
    { options: id },
  );

  useEffect(() => {
    if (data && data?.data?.seen === false && data?.data.status !== "ACTIVE") {
      EventsApi.seenAutoService(id).then(() => {
        refetch();
      });
    }
  }, [data, id, refetch]);

  return { data, isLoading, refetch };
};
