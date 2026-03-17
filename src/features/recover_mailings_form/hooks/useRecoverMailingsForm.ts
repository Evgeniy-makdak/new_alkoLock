import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import type { ID } from '@shared/types/BaseQueryTypes';
import { useUserContext } from '@widgets/users_info/UserContext';

import { useRecoverMailingsFormApi } from '../api/useRecoverMailingsFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useRecoverMailingsForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const { selectedUserId } = useUserContext();
  const mutate = useRecoverMailingsFormApi();
  const [isLoading, setIsLoading] = useState(false);

  const handleRecover = async () => {
    setIsLoading(true);
    try {
      const response = await mutate(id as string);
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
      setIsLoading(false);
    }
  };

  return { handleRecover, isLoading };
};
