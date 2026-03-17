import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useTrueDeleteUserFormApi } from '../api/useTrueDeleteUserFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useTrueDeleteUserForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const { selectedUserId } = useUserContext();
  const mutate = useTrueDeleteUserFormApi();
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const handleDelete = async () => {
    if (id != null) addProcessingId('users', id);
    try {
      await mutate(id);
      if (id === selectedUserId) {
        closeAside();
      }
      closeModal();
      await clearCache();
    } finally {
      if (id != null) removeProcessingId('users', id);
    }
  };

  return handleDelete;
};
