import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import { useTypeEventSelect } from '../hooks/useTypeEventSelect';

type TypeEventSelectProps<T> = Omit<SearchMultipleSelectProps<T>, 'values'>;

export const TypeEventSelect = <T,>(props: TypeEventSelectProps<T>) => {
  const { marksCarList, isLoading } = useTypeEventSelect();
  return <SearchMultipleSelect isLoading={isLoading} values={marksCarList} {...props} />;
};
