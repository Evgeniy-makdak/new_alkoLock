import type { ID } from '@shared/types/BaseQueryTypes';

import { useDeleteCarFormApi } from '../api/useDeleteCarFormApi';

export const useDeleteCarForm = (id: ID, closeModal: () => void) => {
  const mutate = useDeleteCarFormApi();

  const handleDelete = async () => {
    await mutate(id);
    closeModal();
  };
  return handleDelete;
};
