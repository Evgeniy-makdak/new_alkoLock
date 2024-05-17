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
}

export function CarsSelect<T>({
  vieBranch = false,
  branchId,
  notInBranch,
  ...rest
}: CarsSelectProps<T>) {
  const { onChange, onReset, isLoading, carList } = useCarsSelect(vieBranch, branchId, notInBranch);
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
