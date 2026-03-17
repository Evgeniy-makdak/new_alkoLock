import { useState } from 'react';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useRecoverCarFormApi } from '../api/useRecoverCarFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useRecoverCarForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const { selectedUserId } = useUserContext();
  const mutate = useRecoverCarFormApi();
  const [isLoading, setIsLoading] = useState(false);
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const handleRecover = async () => {
    if (id != null) addProcessingId('vehicles', id);
    setIsLoading(true);
    try {
      await mutate(id);
      if (id === selectedUserId) {
        closeAside();
      }
      closeModal();
      await clearCache();
    } finally {
      if (id != null) removeProcessingId('vehicles', id);
      setIsLoading(false);
    }
  };

  return { handleRecover, isLoading };
};
