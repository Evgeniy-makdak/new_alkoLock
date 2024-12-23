import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useEffect, useRef } from 'react';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useAutoServiceInfoApi = (id: ID) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.AVTOSERVISE_EVENTS_ITEM],
    EventsApi.getEventItemForAutoServise,
    { options: id },
  );

  const prevStatusRef = useRef(data?.data?.status);

  useEffect(() => {
    if (data && data?.data?.seen === false && data?.data.status !== "ACTIVE") {
      EventsApi.seenAutoService(id).then(() => {
        refetch();
      });
    }
  }, [data, id, refetch]);

  useEffect(() => {
    const currentStatus = data?.data?.status;
    if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
      refetch();
    }

    prevStatusRef.current = currentStatus;
  }, [data?.data?.status, refetch]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); 

    return () => clearInterval(interval); 
  }, [refetch]);

  return { data, isLoading, refetch };
};
