import { AttachmentsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useAttachmentsApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.ATTACHMENT_LIST],
    AttachmentsApi.getList,
    {
      options,
      settings: { refetchInterval: 30000 },
    },
  );

  return { attachmentList: data?.data || [], isLoading, refetch };
};
