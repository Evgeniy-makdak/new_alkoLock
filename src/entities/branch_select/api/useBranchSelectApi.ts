/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';

import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useBranchSelectApi = (options?: QueryOptions) => {
  // Мемоизируем options для стабильности ключа запроса
  const memoizedOptions = useMemo(() => options || {}, [JSON.stringify(options)]);

  const { data, isLoading } = useConfiguredQuery(
    [QueryKeys.BRANCH_LIST_SELECT],
    () => BranchApi.getBranchList(memoizedOptions),
    {
      options: memoizedOptions,
      settings: {
        staleTime: 60 * 50 * 1000,
      } as any,
    },
  );

  return { branch: data?.data, isLoading };
};
