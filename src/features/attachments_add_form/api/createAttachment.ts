import { AttachmentsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { AttachmentsCreateData } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuerys = [QueryKeys.ATTACHMENT_LIST];

export const useCreateAttachment = () => {
  const updateQuerysFn = useUpdateQueries();
  const { mutate } = useMutation({
    mutationFn: (data: AttachmentsCreateData) => AttachmentsApi.createItem(data),
    onSuccess: () => updateQuerysFn(updateQuerys),
  });
  return mutate;
};
