/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlcolocksApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

export const useAlkolocksApi = (options: QueryOptions) => {
  const { statusFilter } = useStatusFilter();
  const filterKey = statusFilter as any;
  // Добавление логики для параметров запроса
  let additionalQuery = '';
  if (statusFilter === 'Активные') {
    additionalQuery = '&all.isActive.in=true';
  } else if (statusFilter === 'Неактивные') {
    additionalQuery = '&all.isActive.in=false';
  }
  // Модификация options с учётом дополнительных параметров
  const modifiedOptions: QueryOptions = {
    ...options,
    query: options.query ? `${options.query}${additionalQuery}` : additionalQuery,
  };

  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ALKOLOCK_LIST_TABLE, filterKey],
    AlcolocksApi.getListAlcolocks,
    { options: modifiedOptions, settings: { refetchInterval: 10000 } as any },
  );

  return { data: data?.data, isLoading, refetch };
};
