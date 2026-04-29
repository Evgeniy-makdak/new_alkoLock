/* eslint-disable @typescript-eslint/no-explicit-any */
import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

type UseRolesSelectApiSettings = {
  enabled?: boolean;
};

export const useRolesSelectApi = (options: QueryOptions, settings?: UseRolesSelectApiSettings) => {
  // Backward compatibility: часть кода передает size вместо limit.
  const normalizedOptions: QueryOptions = {
    ...options,
    limit: options?.limit ?? options?.size,
  };

  const { data, isLoading, isFetching, refetch } = useConfiguredQuery(
    [QueryKeys.ROLES_LIST],
    RolesApi.getList,
    {
      options: normalizedOptions,
      settings: {
        staleTime: 0,
        enabled: settings?.enabled,
      } as any,
    },
  );

  return {
    data: data?.data?.content || [],
    totalElements: data?.data?.totalElements ?? 0,
    isLoading,
    isFetching,
    refetch,
  };
};
