import type { ID } from '@shared/types/BaseQueryTypes';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useTrueDeleteMailingsFormApi } from '../api/useTrueDeleteMailingsFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useTrueDeleteMailingsForm = (
  id: ID,
  closeModal: () => void,
  closeAside: () => void,
) => {
  const { selectedUserId } = useUserContext();
  const mutate = useTrueDeleteMailingsFormApi();

  const handleDelete = async () => {
    await mutate(id as string);
    if (id === selectedUserId) {
      closeAside();
    }
    closeModal();
    clearCache();
  };

  return handleDelete;
};
