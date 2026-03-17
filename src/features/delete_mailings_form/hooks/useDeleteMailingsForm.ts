import { useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';

import { useDeleteMailingsFormApi } from '../api/useDeleteMailingsFormApi';

async function clearCache() {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }
}

export const useDeleteMailingsForm = (id: ID, closeModal: () => void, closeAside: () => void) => {
  const mutate = useDeleteMailingsFormApi();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      // id здесь - это email (строка)
      await mutate(id as string);
      closeAside();
      closeModal();
      await clearCache();
    } catch (error) {
      console.error('Ошибка при удалении рассылки:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleDelete, isLoading };
};
