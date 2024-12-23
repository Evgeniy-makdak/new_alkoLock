import type { JSX } from 'react';

import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import { useRolesSelect } from '../hooks/useRolesSelect';

type RolesSelectProps<T> = {
  notShowGlobalAdminRole?: boolean;
  onDriverRoleCheck?: (hasDriverRole: boolean) => void;
} & Omit<SearchMultipleSelectProps<T>, 'values'>;

export const RolesSelect = <T,>(props: RolesSelectProps<T>): JSX.Element => {
  const { onChange, isLoading, onReset, roles } = useRolesSelect(
    props.notShowGlobalAdminRole,
    props.onDriverRoleCheck,
  );

  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      onChange={(selectedValue) => {
        if (typeof selectedValue === 'string') {
          onChange(selectedValue);
        } else if (Array.isArray(selectedValue)) {
          onChange(selectedValue.join(','));
        }
      }}
      isLoading={isLoading}
      values={roles}
      {...props}
    />
  );
};
