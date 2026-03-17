import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useRecoverUserFormApi } from '../api/useRecoverUserFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useRecoverUserForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const { selectedUserId } = useUserContext();
  const mutate = useRecoverUserFormApi();
  const [isLoading, setIsLoading] = useState(false);
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const handleRecover = async () => {
    if (id != null) addProcessingId('users', id);
    setIsLoading(true);
    try {
      const response = await mutate(id);
      if (response?.status === 400) {
        const messageWithBreaks = response?.detail;
        enqueueSnackbar(messageWithBreaks, {
          variant: 'error',
        });
      }
      if (id === selectedUserId) {
        closeAside();
      }
      closeModal();
      await clearCache();
    } finally {
      if (id != null) removeProcessingId('users', id);
      setIsLoading(false);
    }
  };

  return { handleRecover, isLoading };
};
