import type { JSX } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import { useUserSelect } from '../hooks/useUserSelect';
import { adapterMapOptionsForList } from '../lib/adapterMapOptions';

type UsersSelectProps<T> = {
  vieBranch?: boolean;
  branchId?: ID;
  notInBranch?: ID;
  needDriverId?: boolean;
  useUserAttachSort?: boolean;
  excludeUserWithId2?: boolean;
  onlyWithDriverId?: boolean;
  equalsBranchId?: boolean;
  excludeSuperAdmin?: boolean;
  showBranchName?: boolean;
  excludeDisabledUsers?: boolean;
  isAttachment?: boolean;
  includeActiveOnly?: boolean;
} & Omit<SearchMultipleSelectProps<T>, 'values'>;

export const UsersSelect = <T,>({
  showBranchName = false,
  branchId,
  notInBranch,
  excludeUserWithId2,
  onlyWithDriverId,
  needDriverId,
  equalsBranchId,
  excludeDisabledUsers,
  isAttachment,
  includeActiveOnly,
  vieBranch = false,
  excludeSuperAdmin = false,
  placeholder,
  disabled,
  ...rest
}: UsersSelectProps<T>): JSX.Element => {
  const displayBranchName = showBranchName || vieBranch;
  const { onChange, isLoading, onReset, driversList } = useUserSelect(
    branchId,
    notInBranch,
    excludeDisabledUsers,
    needDriverId,
    excludeUserWithId2,
    onlyWithDriverId,
    equalsBranchId,
    isAttachment,
    excludeSuperAdmin,
    (driver) => adapterMapOptionsForList(driver, displayBranchName),
    includeActiveOnly,
  );

  const placeholderResolved =
    disabled && driversList.length === 1
      ? placeholder?.trim()
        ? placeholder
        : driversList[0].label
      : placeholder;

  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={driversList}
      disabled={disabled}
      placeholder={placeholderResolved}
      {...rest}
    />
  );
};
