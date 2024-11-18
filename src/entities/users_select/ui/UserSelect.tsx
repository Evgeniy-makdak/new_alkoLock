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
  needDriverId?: boolean;
  useUserAttachSort?: boolean; // Добавлен флаг для управления сортировкой
  excludeUserWithId2?: boolean;
  onlyWithDriverId?: boolean;
} & Omit<SearchMultipleSelectProps<T>, 'values'>;

export const UsersSelect = <T,>({
  // vieBranch,
  branchId,
  notInBranch,
  excludeUserWithId2,
  onlyWithDriverId,
  needDriverId,
  // useUserAttachSort = false, // По умолчанию сортировка по USER
  ...rest
}: UsersSelectProps<T>): JSX.Element => {
  const { onChange, isLoading, onReset, driversList } = useUserSelect(
    // vieBranch,
    branchId,
    notInBranch,
    needDriverId,
    // useUserAttachSort, // Передаем флаг в хук
    excludeUserWithId2,
    onlyWithDriverId,
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
