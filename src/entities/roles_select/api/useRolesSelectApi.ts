import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useRolesSelectApi = (options: QueryOptions) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.ROLES_LIST], RolesApi.getList, {
    options,
  });

  return { data: data?.data || [], isLoading };
};
