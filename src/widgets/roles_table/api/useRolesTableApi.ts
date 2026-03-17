/* eslint-disable @typescript-eslint/no-explicit-any */
import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useRolesTableApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ROLES_LIST_TABLE],
    RolesApi.getList,
    { options, settings: { refetchInterval: 10000 } as any },
  );

  return { roles: data?.data, isLoading, refetch };
};
