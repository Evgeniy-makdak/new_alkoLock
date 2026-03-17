import { useState } from 'react';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useTrueDeleteCarFormApi } from '../api/useTrueDeleteCarFormApi';

export const useTrueDeleteCarForm = (id: ID, closeModal: () => void) => {
  const mutate = useTrueDeleteCarFormApi();
  const [isLoading, setIsLoading] = useState(false);
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const onTrueDelete = async () => {
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

  return { onTrueDelete, isLoading };
};
