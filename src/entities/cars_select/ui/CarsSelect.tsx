/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-explicit-any */
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
  isActive?: boolean;
  reset?: any;
  includeIsActive?: boolean;
  isAttachment?: boolean;
  /** Опции вне выдачи API (дедуп по value). Не влияет на запрос к серверу. */
  alwaysIncludeOptions?: Value[];
}

export function CarsSelect<T>({
  specified,
  isActive,
  vieBranch = false,
  branchId,
  notInBranch,
  includeIsActive,
  reset,
  isAttachment,
  alwaysIncludeOptions,
  ...rest
}: CarsSelectProps<T>) {
  const { inputValue, onChange, isLoading, carList } = useCarsSelect(
    vieBranch,
    branchId,
    notInBranch,
    specified,
    isActive,
    includeIsActive,
    isAttachment,
    alwaysIncludeOptions,
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
