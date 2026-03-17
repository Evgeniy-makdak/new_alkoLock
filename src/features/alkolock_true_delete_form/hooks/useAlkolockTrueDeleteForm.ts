import { useState } from 'react';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useAlkolockTrueDeleteFormApi } from '../api/useAlkolockTrueDeleteFormApi';

export const useAlkolockTrueDeleteForm = (alkolock: ID, closeDeleteModal: () => void) => {
  const { trueDeleteAlkolock } = useAlkolockTrueDeleteFormApi();
  const [isLoading, setIsLoading] = useState(false);
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const handleDelete = async () => {
    if (!alkolock) return;
    addProcessingId('alkolocks', alkolock);
    setIsLoading(true);
    try {
      await trueDeleteAlkolock(alkolock);
      closeDeleteModal();
    } finally {
      removeProcessingId('alkolocks', alkolock);
      setIsLoading(false);
    }
  };

  return { onTrueDelete: handleDelete, isLoading };
};
