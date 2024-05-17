import type { ID } from '@shared/types/BaseQueryTypes';

import { useDeleteUserFormApi } from '../api/useDeleteUserFormApi';

export const useDeleteUserForm = (id: ID, closeModal: () => void) => {
  const mutate = useDeleteUserFormApi();

  const handleDelete = async () => {
    await mutate(id);
    closeModal();
  };
  return handleDelete;
};
