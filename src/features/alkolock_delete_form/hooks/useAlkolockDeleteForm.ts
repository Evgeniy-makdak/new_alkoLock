import { useState } from 'react';

import { useProcessingStore } from '@shared/model/processing_store/processingStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useAlkolockDeleteFormApi } from '../api/useAlkolockDeleteFormApi';

export const useAlkolockDeleteForm = (alkolock: ID, closeDeleteModal: () => void) => {
  const { deleteAlkolock } = useAlkolockDeleteFormApi();
  const [isLoading, setIsLoading] = useState(false);
  const addProcessingId = useProcessingStore((state) => state.addProcessingId);
  const removeProcessingId = useProcessingStore((state) => state.removeProcessingId);

  const handleDelete = async () => {
    if (!alkolock) return;
    addProcessingId('alkolocks', alkolock);
    setIsLoading(true);
    try {
      await deleteAlkolock(alkolock);
      closeDeleteModal();
    } finally {
      removeProcessingId('alkolocks', alkolock);
      setIsLoading(false);
    }
  };

  return { handleDelete, isLoading };
};
