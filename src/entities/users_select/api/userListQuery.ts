/* eslint-disable @typescript-eslint/no-explicit-any */
import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useUserListQuery = (
  options: QueryOptions & { isAttachment?: boolean; includeActiveOnly?: boolean },
  excludeDisabledUsers = false,
) => {
  // Добавляем excludeDisabledUsers в queryOptions, если параметр передан
  const queryOptions = excludeDisabledUsers ? { ...options, excludeDisabledUsers: false } : options;

  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.USER_LIST],
    UsersApi.getListToAttachments,
    {
      options: queryOptions,
    },
  );

  return { data: (data?.data as any) || [], isLoading };
};
