import { useEffect, useState } from 'react';

import { EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';
import { keepPreviousData } from '@tanstack/react-query';

export const useEventsApi = (
  options: QueryOptions & { searchQuery?: string },
  isMapPage = false,
) => {
  const { statusFilter } = useStatusFilter();
  const filterKey = statusFilter as any;
  const [totalLimit, setTotalLimit] = useState<number | undefined>(undefined);

  // Фильтр по активности пользователей (как на вкладках Пользователи/Алкозамки/Транспорт)
  let additionalQuery = '';
  if (statusFilter === 'Активные') {
    additionalQuery = '&all.user.isActive.in=true';
  } else if (statusFilter === 'Неактивные') {
    additionalQuery = '&all.user.isActive.in=false';
  }

  // Модификация options с учётом дополнительных параметров
  const modifiedOptions: QueryOptions & { searchQuery?: string } = {
    ...options,
    query: options.query ? `${options.query}${additionalQuery}` : additionalQuery,
  };

  // Первый запрос для получения общего количества элементов
  const { data: countData } = useConfiguredQuery(
    [QueryKeys.EVENTS_COUNT as QueryKeys, options.startDate, options.endDate],
    EventsApi.getList,
    {
      options: {
        ...modifiedOptions,
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

  const queryOptions: QueryOptions = isMapPage
    ? {
        ...modifiedOptions,
        page: 0,
        limit: totalLimit ?? Number.MAX_SAFE_INTEGER,
        sortBy: 'DATE_OCCURRENT',
        order: 'desc',
        startDate: modifiedOptions.startDate,
        endDate: modifiedOptions.endDate,
      }
    : modifiedOptions;

  const queryKey = isMapPage
    ? [QueryKeys.EVENTS_LIST as QueryKeys, filterKey, options.startDate, options.endDate]
    : [QueryKeys.EVENTS_LIST_TABLE as QueryKeys, filterKey, options.startDate, options.endDate];

  const { data, isLoading, isPlaceholderData, refetch } = useConfiguredQuery(
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
