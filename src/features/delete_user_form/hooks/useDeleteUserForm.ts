import type { ID } from '@shared/types/BaseQueryTypes';

import { useDeleteUserFormApi } from '../api/useDeleteUserFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useDeleteUserForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const mutate = useDeleteUserFormApi();

  const handleDelete = async () => {
    await mutate(id);
    closeModal();
    closeAside();
    clearCache();
  };

  return handleDelete;
};
