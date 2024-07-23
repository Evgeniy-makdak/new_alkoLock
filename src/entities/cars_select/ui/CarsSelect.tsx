import type { ID } from '@shared/types/BaseQueryTypes';
import { SearchMultipleSelect, type Value, type Values } from '@shared/ui/search_multiple_select';

import { useCarsSelect } from '../hooks/useCarsSelect';
import { useEffect } from 'react';

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
  const {value} = rest
  const { onChange, onReset, isLoading, carList } = useCarsSelect(vieBranch, branchId, notInBranch, specified);
  
useEffect(() => {
  if (carList?.length && reset) {
    reset()
  }
}, [carList.length])
if (!value) return null;
  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={carList}
      {...rest}
    />
  );
}
