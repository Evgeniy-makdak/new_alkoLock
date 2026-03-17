/* eslint-disable @typescript-eslint/no-explicit-any */
import { EmailNotificationsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { appStore } from '@shared/model/app_store/AppStore';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

export const useMailingsTableApi = (options: QueryOptions) => {
  const { statusFilter } = useStatusFilter();
  const filterKey = statusFilter as any;

  const currentBranchId = appStore.getState().selectedBranchState?.id;

  let additionalQuery = '';
  if (statusFilter === 'Активные') {
    additionalQuery = '&all.isActive.in=true';
  } else if (statusFilter === 'Неактивные') {
    additionalQuery = '&all.isActive.in=false';
  }

  const modifiedOptions: QueryOptions = {
    ...options,
    query: options.query ? `${options.query}${additionalQuery}` : additionalQuery,
  };

  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.MAILINGS_LIST_TABLE, filterKey, currentBranchId],
    () => EmailNotificationsApi.getList(modifiedOptions, currentBranchId as number),
    { options: modifiedOptions, settings: { refetchInterval: 10000 } as any },
  );

  return { mailings: data?.data, isLoading, refetch };
};
