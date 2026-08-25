import { useEffect, useState } from 'react';

import { keepPreviousData } from '@tanstack/react-query';

import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useEventsApi = (
  options: QueryOptions & { searchQuery?: string },
  isMapPage = false,
) => {
  const [totalLimit, setTotalLimit] = useState<number | undefined>(undefined);

  // Первый запрос для получения общего количества элементов
  const { data: countData } = useConfiguredQuery(
    //@ts-expect-error: Временное решение
    [QueryKeys.EVENTS_COUNT as QueryKeys, options.startDate, options.endDate],
    EventsApi.getList,
    {
      options: {
        ...options,
        page: 0,
        limit: 1,
      },
      settings: {
        enabled: isMapPage,
      },
    },
  );

  useEffect(() => {
    if (countData?.data?.totalElements) {
      setTotalLimit(countData.data.totalElements);
    }
  }, [countData]);

  const queryOptions = isMapPage
    ? {
        ...options,
        page: 0,
        limit: totalLimit ?? Number.MAX_SAFE_INTEGER,
        sortBy: 'DATE_OCCURRENT',
        order: 'desc',
        startDate: options.startDate,
        endDate: options.endDate,
      }
    : options;

  const queryKey = isMapPage
    ? [QueryKeys.EVENTS_LIST as QueryKeys, options.startDate, options.endDate]
    : [QueryKeys.EVENTS_LIST_TABLE as QueryKeys, options.startDate, options.endDate];

  const { data, isLoading, isPlaceholderData, refetch } = useConfiguredQuery(
    //@ts-expect-error: Временное решение
    queryKey,
    EventsApi.getList,
    {
      options: queryOptions,
      settings: {
        refetchInterval: 10000,
        retry: 1,
        staleTime: isMapPage ? 30000 : 0,
        enabled: !isMapPage || !!totalLimit,
        // Таблица «События»: при смене page queryKey меняется и без placeholder
        // data/totalElements на кадр становятся undefined → rowCount=0 → DataGrid
        // сбрасывает пагинацию на 1-ю страницу (только на ещё не кэшированной page).
        // Карта (isMapPage) не затрагивается.
        ...(isMapPage ? {} : { placeholderData: keepPreviousData }),
      },
    },
  );

  return { isLoading, isPlaceholderData: Boolean(isPlaceholderData), data, refetch };
};
