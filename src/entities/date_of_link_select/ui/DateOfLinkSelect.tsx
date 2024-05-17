import { SearchMultipleSelect, type Value, type Values } from '@shared/ui/search_multiple_select';

import { useDateOfLinkSelect } from '../hooks/useDateOfLinkSelect';

interface DateCreateSelectProps<T> {
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
  value: Values;
  testid?: string;
  multiple?: boolean;
  label?: string;
  name: keyof T;
  error?: boolean;
}

export function DateOfLinkSelect<T>(props: DateCreateSelectProps<T>) {
  const { dateCreate, isLoading, onChange, onReset } = useDateOfLinkSelect();
  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={dateCreate}
      {...props}
    />
  );
}
