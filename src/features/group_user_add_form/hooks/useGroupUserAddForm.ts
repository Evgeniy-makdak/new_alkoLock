import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupUserAddFormApi } from '../api/useGroupUserAddFormApi';

export const useGroupUserAddForm = (branchId: ID, close: () => void) => {
  const [users, setCars] = useState<Values>([]);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);
  const { moveUsers } = useGroupUserAddFormApi();

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setCars(values);
    closeAlert();
    setApiMessage(null);
  };

  const onSubmit = async () => {
    if (users.length === 0) {
      setError(true);
      return;
    }

    try {
      closeAlert();
      const response = await moveUsers({ branchId, userIds: ArrayUtils.getArrayFromValues(users) });

      if (response?.detail) {
        // Формируем сообщение с переносами строк
        const messageWithBreaks = response.detail.replace(/\n/g, '\n');
        enqueueSnackbar(messageWithBreaks, {
          variant: 'error',
          style: { whiteSpace: 'pre-line' }, // Это обеспечит переносы строк
          hideIconVariant: true,
        });

        setApiMessage(response.detail);
        return;
      }

      close();
    } catch (error: any) {
      if (error?.response?.status === 400) {
        setApiMessage(error.response.data.detail);
      } else {
        setApiMessage('Произошла ошибка при перемещении пользователей');
      }
    }
  };

  const handleOpenAlert = () => {
    if (users.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const showAlert = openAlert && !error && users.length > 0;

  return {
    users,
    onSelect,
    error,
    onSubmit,
    closeAlert,
    handleOpenAlert,
    showAlert,
    apiMessage,
    setApiMessage,
  };
};
