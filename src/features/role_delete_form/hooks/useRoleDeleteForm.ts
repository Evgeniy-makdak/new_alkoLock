import type { ID } from '@shared/types/BaseQueryTypes';

import { useRoleDeleteFormApi } from '../api/useRoleDeleteFormApi';

export const useRoleDeleteForm = (id: ID, close: () => void) => {
  const { mutateAsync } = useRoleDeleteFormApi();

  const handleDelete = async () => {
    await mutateAsync(id);
    close();
  };

  return { handleDelete };
};
