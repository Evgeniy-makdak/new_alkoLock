import type { ID } from '@shared/types/BaseQueryTypes';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useDeleteUserFormApi } from '../api/useDeleteUserFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useDeleteUserForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const { selectedUserId } = useUserContext();
  const mutate = useDeleteUserFormApi();

  const handleDelete = async () => {
    await mutate(id);
    if (id === selectedUserId) {
      closeAside();
    }
    closeModal();
    clearCache();
  };

  console.log('for delete', id);
  console.log('selectedUserId from context', selectedUserId);

  return handleDelete;
};
