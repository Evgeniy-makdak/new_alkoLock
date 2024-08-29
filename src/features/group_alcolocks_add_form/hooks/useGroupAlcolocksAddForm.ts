import { useState } from 'react';

import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupAlcolocksAddFormApi } from '../api/useGroupAlcolocksAddFormApi';

export const useGroupAlcolocksAddForm = (branchId: ID, close: () => void) => {
  const [alcolocks, setAlcolocks] = useState<Values>([]);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);
  const { mutate } = useGroupAlcolocksAddFormApi();

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setAlcolocks(values);
    closeAlert();
  };
  const onSubmit = () => {
    if (alcolocks.length === 0) {
      setError(true);
      return;
    }
    closeAlert();
    mutate({ branchId, ids: ArrayUtils.getArrayFromValues(alcolocks) });
    close();
  };

  const handleOpenAlert = () => {
    if (alcolocks.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const showAlert = openAlert && !error && alcolocks.length > 0;
  return { alcolocks, onSelect, error, onSubmit, closeAlert, handleOpenAlert, showAlert };
};
