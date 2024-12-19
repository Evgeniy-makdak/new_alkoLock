import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';
import { useEventClasses } from '@widgets/events_table/hooks/useEventClasses';

type LevelSelectProps<T> = Omit<SearchMultipleSelectProps<T>, 'values'>;

export const LevelSelect = <T,>(props: LevelSelectProps<T>) => {
  const { eventClasses, loading, setSearchTerm } = useEventClasses();

  const transformedClasses = eventClasses.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  return (
    <SearchMultipleSelect
      isLoading={loading}
      values={transformedClasses}
      onReset={() => {}}
      onInputChange={(e) => setSearchTerm(e)}
      {...props}
    />
  );
};
