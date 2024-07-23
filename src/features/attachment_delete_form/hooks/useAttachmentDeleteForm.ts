import type { ID } from '@shared/types/BaseQueryTypes';

import { useAttachmentDeleteFormApi } from '../api/useAttachmentDeleteFormApi';

export const useAttachmentDeleteForm = (id: ID, closeModal: () => void) => {
  const mutate = useAttachmentDeleteFormApi();

  const handleDelete = async () => {
    await mutate(id);
    closeModal();
  };
  return handleDelete;
};
