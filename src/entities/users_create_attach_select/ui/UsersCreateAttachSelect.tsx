import { SearchMultipleSelect, type Value, type Values } from '@shared/ui/search_multiple_select';

import { useUsersCreateAttachSelect } from '../hooks/useUsersCreateAttachSelect';

interface UsersCreateAttachSelectProps<T> {
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
  value: Values;
  testid?: string;
  multiple?: boolean;
  label?: string;
  error?: boolean;
  name: keyof T;
}

export function UsersCreateAttachSelect<T>(props: UsersCreateAttachSelectProps<T>) {
  const { createdBy, isLoading, onChange, onReset } = useUsersCreateAttachSelect();
  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={createdBy}
      {...props}
    />
  );
}
