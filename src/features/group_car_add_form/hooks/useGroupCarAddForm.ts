import { useState } from 'react';

import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { Value, Values } from '@shared/ui/search_multiple_select';
import ArrayUtils from '@shared/utils/ArrayUtils';

import { useGroupCarAddFormApi } from '../api/useGroupCarAddFormApi';

export const useGroupCarAddForm = (branchId: ID, close: () => void) => {
  const [cars, setCars] = useState<Values>([]);
  const [openAlert, toggleAlert, closeAlert] = useToggle(false);
  const [error, setError] = useState(false);
  const { mutate } = useGroupCarAddFormApi();

  const onSelect = (_type: string, value: string | Value | (string | Value)[]) => {
    setError(false);
    const values = ArrayUtils.getArrayValues(value);
    setCars(values);
    closeAlert();
  };
  const onSubmit = () => {
    if (cars.length === 0) {
      setError(true);
      return;
    }
    closeAlert();
    mutate({ branchId, ids: ArrayUtils.getArrayFromValues(cars) });
    close();
  };

  const handleOpenAlert = () => {
    if (cars.length === 0) {
      setError(true);
      return;
    }
    toggleAlert();
  };

  const showAlert = openAlert && !error && cars.length > 0;
  return { cars, onSelect, error, onSubmit, closeAlert, handleOpenAlert, showAlert };
};
