import type { ID } from '@shared/types/BaseQueryTypes';
import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import { useBranchSelect } from '../hooks/useBranchSelect';

type BranchSelectProps<T> = {
  filter?: ID;
} & Omit<SearchMultipleSelectProps<T>, 'onReset' | 'onInputChange' | 'isLoading' | 'values'>;

export function BranchSelect<T>({ filter, ...rest }: BranchSelectProps<T>) {
  const { onChange, onReset, isLoading, branchList } = useBranchSelect(filter);
  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={branchList}
      {...rest}
    />
  );
}
