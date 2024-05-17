import type { JSX } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import { useUserSelect } from '../hooks/useUserSelect';

type UsersSelectProps<T> = {
  vieBranch?: boolean;
  branchId?: ID;
  notInBranch?: ID;
  // TODO => убрать needDriverId когда уберут ID у поля driver в сущности User => user: {driver: {id: ID}}
  needDriverId?: boolean;
} & Omit<SearchMultipleSelectProps<T>, 'values'>;

export const UsersSelect = <T,>({
  vieBranch,
  branchId,
  notInBranch,
  needDriverId,
  ...rest
}: UsersSelectProps<T>): JSX.Element => {
  const { onChange, isLoading, onReset, driversList } = useUserSelect(
    vieBranch,
    branchId,
    notInBranch,
    // TODO => убрать needDriverId когда уберут ID у поля driver в сущности User => user: {driver: {id: ID}}
    needDriverId,
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
