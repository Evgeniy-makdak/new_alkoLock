import { AttachmentsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.ATTACHMENT_LIST];

export const useAttachmentDeleteFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (id: ID) => {
      return AttachmentsApi.deleteItem(id);
    },
    onSuccess: () => update(updateQueries),
  });
  return mutateAsync;
};
