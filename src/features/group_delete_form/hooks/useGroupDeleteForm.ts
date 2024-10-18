import type { ID } from '@shared/types/BaseQueryTypes';

import { useGroupDeleteFormApi } from '../api/useGroupDeleteFormApi';

export const useGroupDeleteForm = (id: ID, close: () => void) => {
  const { mutateAsync } = useGroupDeleteFormApi();

  const handleDelete = async (deactivateRecords: boolean) => {
    await mutateAsync({ id, deactivateRecords });
    close();
    window.location.reload();
  };

  return { handleDelete };
};
