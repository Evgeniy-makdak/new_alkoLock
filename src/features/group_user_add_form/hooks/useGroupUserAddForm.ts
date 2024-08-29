import { useState } from 'react';

import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupUserAddFormApi } from '../api/useGroupUserAddFormApi';

export const useGroupUserAddForm = (branchId: ID, close: () => void) => {
  const [users, setCars] = useState<Values>([]);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);
  const { moveUsers } = useGroupUserAddFormApi();

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setCars(values);
    closeAlert();
  };
  const onSubmit = () => {
    if (users.length === 0) {
      setError(true);
      return;
    }
    closeAlert();
    moveUsers({ branchId, userIds: ArrayUtils.getArrayFromValues(users) });
    close();
  };

  const handleOpenAlert = () => {
    if (users.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const showAlert = openAlert && !error && users.length > 0;
  return { users, onSelect, error, onSubmit, closeAlert, handleOpenAlert, showAlert };
};
