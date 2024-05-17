import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useUserListQuery = (options: QueryOptions) => {
  const { data, isLoading } = useConfiguredQuery([QueryKeys.USER_LIST], UsersApi.getList, {
    options,
  });

  return { data: data?.data || [], isLoading };
};
