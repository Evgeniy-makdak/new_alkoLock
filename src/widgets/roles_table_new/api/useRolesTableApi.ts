/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';

import {
  getRolesCache,
  setRolesCache,
  shouldFetchRoles,
} from '@features/role_add_change_form/lib/rolesCache';
import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useRolesTableApi = (options: QueryOptions) => {
  const branchId = options?.filterOptions?.branchId as ID;
  const shouldFetch = shouldFetchRoles(branchId?.toString());

  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ROLES_LIST_TABLE],
    RolesApi.getList,
    {
      options,
      settings: {
        refetchInterval: 10000,
        enabled: shouldFetch,
      } as any,
    },
  );

  useEffect(() => {
    if (data && branchId) {
      setRolesCache(data, branchId.toString());
    }
  }, [data, branchId]);

  const cachedData = getRolesCache();
  const rolesData = cachedData || data?.data;

  return {
    roles: rolesData,
    isLoading,
    refetch,
  };
};
