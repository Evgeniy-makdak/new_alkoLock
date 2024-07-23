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
} & Partial<SearchMultipleSelectProps<T>>;

export function TransportTypeSelect<T>(props: TransportTypeSelect<T>) {
  const { typeTransportList } = useTransportTypeSelect();
  return <SearchMultipleSelect values={typeTransportList} {...props} />;
}
