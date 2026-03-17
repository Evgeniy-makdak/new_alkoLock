/* eslint-disable @typescript-eslint/no-explicit-any */
import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useRolesSelectApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ROLES_LIST],
    RolesApi.getList,
    {
      options,
      settings: {
        staleTime: 0,
      } as any,
    },
  );

  return {
    data: data?.data?.content || [],
    isLoading,
    refetch,
  };
};
