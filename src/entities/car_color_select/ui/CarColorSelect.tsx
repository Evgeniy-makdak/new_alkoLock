import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
  type Value,
  type Values,
} from '@shared/ui/search_multiple_select';

import { useCarColorSelect } from '../hooks/useCarColorSelect';

type CarColorSelectProps<T> = {
  onSelect?: (value: number[] | number) => void;
  testid?: string;
  multiple?: boolean;
  label?: string;
  error?: boolean;
  name: keyof T;
  value?: Values;
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
} & Partial<SearchMultipleSelectProps<T>>;

export function CarColorSelect<T>(props: CarColorSelectProps<T>) {
  const { colorCarList } = useCarColorSelect();
  return <SearchMultipleSelect values={colorCarList} {...props} />;
}
