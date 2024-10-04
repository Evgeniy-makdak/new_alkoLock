import { useEffect } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { SearchMultipleSelect, type Value, type Values } from '@shared/ui/search_multiple_select';

import { useCarsSelect } from '../hooks/useCarsSelect';

interface CarsSelectProps<T> {
  testid?: string;
  multiple?: boolean;
  label?: string;
  error?: boolean;
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
  name: keyof T;
  value: Values;
  branchId?: ID;
  notInBranch?: ID;
  vieBranch?: boolean;
  specified?: boolean;
  reset?: any;
}

export function CarsSelect<T>({
  specified,
  vieBranch = false,
  branchId,
  notInBranch,
  reset,
  ...rest
}: CarsSelectProps<T>) {
  const { inputValue, onChange, isLoading, carList } = useCarsSelect(
    vieBranch,
    branchId,
    notInBranch,
    specified,
  );

  useEffect(() => {
    if (carList?.length && reset) {
      reset();
    }
  }, []);

  return (
    <SearchMultipleSelect
      inputValue={inputValue}
      onInputChange={onChange}
      isLoading={isLoading}
      values={carList}
      {...rest}
    />
  );
}
