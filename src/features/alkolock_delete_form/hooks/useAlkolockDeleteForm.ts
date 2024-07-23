import type { ID } from '@shared/types/BaseQueryTypes';

import { useAlkolockDeleteFormApi } from '../api/useAlkolockDeleteFormApi';

export const useAlkolockDeleteForm = (alkolock: ID, closeDeleteModal: () => void) => {
  const { deleteAlkolock } = useAlkolockDeleteFormApi();

  const handleDelete = async () => {
    if (!alkolock) return;
    await deleteAlkolock(alkolock);
    closeDeleteModal();
  };
  return handleDelete;
};
