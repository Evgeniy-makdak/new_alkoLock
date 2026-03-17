import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useGroupUsersTableApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.USER_LIST],
    (op: QueryOptions) => UsersApi.getList(op, true),
    { options },
  );

  return { isLoading, users: data?.data, refetch };
};
