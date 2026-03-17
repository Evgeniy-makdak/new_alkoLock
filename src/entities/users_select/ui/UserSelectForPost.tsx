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
  excludeDisabledUsers?: boolean;
  isAttachment?: boolean;
} & Omit<SearchMultipleSelectProps<T>, 'values'>;

export const UsersSelectForPost = <T,>({
  // vieBranch,
  branchId,
  notInBranch,
  excludeUserWithId2,
  onlyWithDriverId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- проп из интерфейса, исключаем из rest чтобы не передавать в DOM
  needDriverId,
  equalsBranchId,
  excludeDisabledUsers,
  isAttachment,
  useUserAttachSort = false,
  ...rest
}: UsersSelectProps<T>): JSX.Element => {
  const { onChange, isLoading, onReset, driversList } = useUserSelect(
    branchId,
    notInBranch,
    excludeDisabledUsers,
    useUserAttachSort,
    excludeUserWithId2,
    onlyWithDriverId,
    equalsBranchId,
    isAttachment,
    false, // excludeSuperAdmin
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
