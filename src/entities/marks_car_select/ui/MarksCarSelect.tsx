import { SearchMultipleSelect, type Value, type Values } from '@shared/ui/search_multiple_select';

import { useMarksCarSelect } from '../hooks/useMarksCarSelect';

interface MarksCarSelectProps<T> {
  onSelectMarkCar?: (value: number[] | number) => void;
  testid?: string;
  multiple?: boolean;
  label?: string;
  error?: boolean;
  name: keyof T;
  value?: Values;
  setValueStore?: (type: keyof T, value: string | Value | (string | Value)[]) => void;
}

export function MarksCarSelect<T>(props: MarksCarSelectProps<T>) {
  const { onChange, isLoading, onReset, marksCarList } = useMarksCarSelect();
  return (
    <SearchMultipleSelect
      onReset={onReset}
      onInputChange={onChange}
      isLoading={isLoading}
      values={marksCarList}
      {...props}
    />
  );
}
