// useAutoServiceInfoApi.ts

/* eslint-disable no-console */
import { useEffect, useRef } from 'react';

import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useAutoServiceInfo } from '@widgets/auto_service_info/AutoServiceInfoContext';

export const useAutoServiceInfoApi = (id: ID, onFinished?: () => void) => {
  const { setAutoServiceType } = useAutoServiceInfo(); // 👈 получение функции установки типа из контекста

  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.AVTOSERVISE_EVENTS_ITEM],
    EventsApi.getEventItemForAutoServise,
    { options: id },
  );

  // 👇 обновляем тип автосервиса в контексте
  useEffect(() => {
    if (data?.data?.type) {
      setAutoServiceType(data.data.type);
    }
  }, [data?.data?.type, setAutoServiceType]);

  // Новый запрос для получения событий автоподбора
  const { data: eventsResponse } = useConfiguredQuery(
    //@ts-expect-error: временное решение
    [QueryKeys.EVENTS_LIST, id],
    EventsApi.getEventListForAutoService,
    {
      options: {
        filterOptions: {
          branchId: data?.data?.device?.assignment?.branch?.id,
        },
        searchQuery: undefined,
      } as QueryOptions,
      settings: {
        enabled: !!id && !!data?.data?.device?.assignment?.branch?.id,
      },
    },
  );

  const prevStatusRef = useRef(data?.data?.status);
  const intervalRef = useRef<NodeJS.Timeout>();
  const finishedAt = data?.data?.finishedAt;

  useEffect(() => {
    if (data && data?.data?.seen === false && data?.data.status !== 'ACTIVE') {
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
    if (!finishedAt) return;

    const checkFinishedTime = () => {
      const now = new Date();
      const finishedDate = new Date(finishedAt);

      if (now >= finishedDate) {
        clearInterval(intervalRef.current);
        onFinished?.();
      } else {
        refetch();
      }
    };

    // Очищаем предыдущий интервал
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Проверяем сразу при монтировании
    checkFinishedTime();

    // Устанавливаем интервал для проверки
    intervalRef.current = setInterval(checkFinishedTime, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [finishedAt, refetch, onFinished]);

  return { data, events: eventsResponse?.data, isLoading, refetch, onFinished };
};
