// useGroupDeleteForm.ts
import { enqueueSnackbar } from 'notistack';

import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useGroupDeleteFormApi } from '../api/useGroupDeleteFormApi';

export const useGroupDeleteForm = (
  id: ID,
  close: () => void,
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void,
) => {
  const { mutateAsync } = useGroupDeleteFormApi();

  const handleDelete = async (deactivateRecords: boolean) => {
    try {
      const response = await mutateAsync({ id, deactivateRecords });

      if (response?.status === 400) {
        const messageWithBreaks = response.detail.replace(/\n/g, '\n');
        enqueueSnackbar(messageWithBreaks, {
          variant: 'error',
          style: { whiteSpace: 'pre-line' },
        });
      } else {
        // Устанавливаем активную группу в Основной филиал (id=20)
        setState({ selectedBranchState: { id: 20, name: 'Основной филиал' } });
      }
    } catch (error) {
      enqueueSnackbar('Произошла ошибка при удалении группы', { variant: 'error' });
    } finally {
      close();
    }
  };

  return { handleDelete };
};
