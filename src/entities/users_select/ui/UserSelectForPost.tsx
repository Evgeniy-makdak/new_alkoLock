import type { JSX } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import { useUserSelect } from '../hooks/useUserSelect';
import { adapterMapOptions } from '../lib/adapterMapOptions';

type UsersSelectProps<T> = {
  vieBranch?: boolean;
  branchId?: ID;
  notInBranch?: ID;
  needDriverId?: boolean;
  useUserAttachSort?: boolean; 
  excludeUserWithId2?: boolean;
  onlyWithDriverId?: boolean;
  equalsBranchId?: boolean;
} & Omit<SearchMultipleSelectProps<T>, 'values'>;

export const UsersSelectForPost = <T,>({
  // vieBranch,
  branchId,
  notInBranch,
  excludeUserWithId2,
  onlyWithDriverId,
  needDriverId,
  equalsBranchId,
  // useUserAttachSort = false, // По умолчанию сортировка по USER
  ...rest
}: UsersSelectProps<T>): JSX.Element => {
  const { onChange, isLoading, onReset, driversList } = useUserSelect(
    branchId,
    notInBranch,
    needDriverId, 
    excludeUserWithId2, 
    onlyWithDriverId, 
    equalsBranchId, 
    adapterMapOptions, 
  );

  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={driversList}
      {...rest}
    />
  );
};
