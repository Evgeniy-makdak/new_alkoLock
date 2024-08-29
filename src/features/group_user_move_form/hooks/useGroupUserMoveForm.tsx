/* eslint-disable no-empty-pattern */
import { useState } from 'react';

import { useToggle } from '@shared/hooks/useToggle';
import { Value, type Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupUserMoveFormApi } from '../api/useGroupUserMoveFormApi';
import type { GroupUserMoveFormProps } from '../ui/GroupUserMoveForm';

export const useGroupUserMoveForm = ({ user, close }: GroupUserMoveFormProps) => {
  const [branchSelect, setBranchSelect] = useState<Values>([]);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setBranchSelect(values);
    closeAlert();
  };
  const { moveUser } = useGroupUserMoveFormApi();
  const handleOpenAlert = () => {
    if (branchSelect.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const onSubmit = () => {
    if (branchSelect.length === 0) {
      setError(true);
      return;
    }
    closeAlert();
    moveUser({ userId: user.id, branchId: branchSelect[0]?.value });
    close();
  };
  const alertText = (
    <>
      При перемещении выбранного пользователя все его текущие связи с ТС будут <b>разорваны</b>.
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
  };
};
