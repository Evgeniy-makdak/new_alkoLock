import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
  Values,
} from '@shared/ui/search_multiple_select';

import { useTypeEventSelect } from '../hooks/useTypeEventSelect';

type TypeEventSelectProps<T> = Omit<SearchMultipleSelectProps<T>, 'values'> & {
  excludedIds?: number[];
  isIn?: boolean;
  useNewEndpoint?: boolean;
  levelEvent?: Values;
  setValueStore?: (name: string, value: any) => void;
  value?: Values;
  getTooltipTitle?: (value: string) => string;
};

export const TypeEventSelect = <T,>({
  excludedIds,
  isIn,
  useNewEndpoint = false,
  levelEvent,
  setValueStore,
  value = [], // Значение по умолчанию
  getTooltipTitle,
  ...props
}: TypeEventSelectProps<T>) => {
  const { marksCarList, isLoading, onReset, onChange } = useTypeEventSelect(
    excludedIds,
    isIn,
    useNewEndpoint,
    levelEvent,
  );

  return (
    <SearchMultipleSelect
      isLoading={isLoading}
      values={marksCarList}
      value={value}
      onReset={onReset}
      onInputChange={onChange}
      setValueStore={setValueStore}
      getTooltipTitle={getTooltipTitle}
      {...props}
    />
  );
};
