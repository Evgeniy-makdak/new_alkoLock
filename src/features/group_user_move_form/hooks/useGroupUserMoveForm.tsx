/* eslint-disable no-empty-pattern */
import { useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import { useToggle } from '@shared/hooks/useToggle';
import { Value, type Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupUserMoveFormApi } from '../api/useGroupUserMoveFormApi';
import type { GroupUserMoveFormProps } from '../ui/GroupUserMoveForm';

export const useGroupUserMoveForm = ({ user, close }: GroupUserMoveFormProps) => {
  const [branchSelect, setBranchSelect] = useState<Values>([]);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);
  const [apiMessage, setApiMessage] = useState<string | null>(null);

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setBranchSelect(values);
    closeAlert();
    setApiMessage(null);
  };

  const { moveUser } = useGroupUserMoveFormApi();

  const handleOpenAlert = () => {
    if (branchSelect.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const onSubmit = async () => {
    if (branchSelect.length === 0) {
      setError(true);
      return;
    }

    try {
      closeAlert();
      const response = await moveUser({ userId: user.id, branchId: branchSelect[0]?.value });
      if (response?.detail) {
        enqueueSnackbar(response?.detail, { variant: 'error' });
        setApiMessage(response.detail);
      }

      close();
    } catch (error: any) {
      if (error?.response?.status === 400) {
        setApiMessage(error.response.data.detail);
      } else {
        setApiMessage('Произошла ошибка при перемещении пользователя');
      }
    }
  };

  const alertText = (
    <>
      При перемещении выбранного пользователя все его текущие связи с ТС будут <b>разорваны</b>, а
      также будут отозваны все несистемные роли.
      <br />
      <br />
      Пожалуйста, подтвердите действие.
    </>
  );

  const showAlert = openAlert && !error && branchSelect.length > 0;

  return {
    onSubmit,
    onSelect,
    showAlert,
    handleOpenAlert,
    error,
    branchSelect,
    closeAlert,
    alertText,
    apiMessage,
    setApiMessage,
  };
};
