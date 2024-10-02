import { useEffect } from 'react';

import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
  type Value,
  type Values,
} from '@shared/ui/search_multiple_select';

import { useTransportTypeSelect } from '../hooks/useTransportTypeSelect';

type TransportTypeSelect<T> = {
  onSelect?: (value: number[] | number) => void;
  testid?: string;
  multiple?: boolean;
  label?: string;
  error?: boolean;
  name: keyof T;
  value?: Values;
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
  reset?: () => void; 
} & Partial<SearchMultipleSelectProps<T>>;

export function TransportTypeSelect<T>(props: TransportTypeSelect<T>) {
  const { value = [], reset } = props;
  const { typeTransportList, filteredTypes, onChange, onReset } = useTransportTypeSelect();

  useEffect(() => {
    if (typeTransportList.length && reset) {
      reset();
    }
  }, [typeTransportList.length, reset]);

  if (!value) return null;

  return (
    <SearchMultipleSelect
      onInputChange={onChange}
      onReset={onReset}
      values={filteredTypes}
      {...props}
    />
  );
}
