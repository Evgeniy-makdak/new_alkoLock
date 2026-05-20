import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

/** SearchMultipleSelect требует onInputChange для debounce; в отчётах поиск по серверу не используется. */
const reportFilterNoopInputChange = () => {};

export function ReportSearchMultipleSelect<T>(props: SearchMultipleSelectProps<T>) {
  const { onInputChange, ...rest } = props;
  return (
    <SearchMultipleSelect
      {...rest}
      onInputChange={onInputChange ?? reportFilterNoopInputChange}
    />
  );
}
