import { useState } from 'react';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useDeleteCarFormApi } from '../api/useDeleteCarFormApi';

export const useDeleteCarForm = (id: ID, closeModal: () => void) => {
  const mutate = useDeleteCarFormApi();
  const [isLoading, setIsLoading] = useState(false);
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const handleDelete = async () => {
    if (id != null) addProcessingId('vehicles', id);
    setIsLoading(true);
    try {
      await mutate(id);
      closeModal();
    } finally {
      if (id != null) removeProcessingId('vehicles', id);
      setIsLoading(false);
    }
  };

  return { handleDelete, isLoading };
};
