import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
} from '@shared/ui/search_multiple_select';

import {
  reportFilterControlSx,
  reportFilterModalControlSx,
} from '@pages/reports/lib/reportFilterControlSx';

/** SearchMultipleSelect требует onInputChange для debounce; в отчётах поиск по серверу не используется. */
const reportFilterNoopInputChange = () => {};

type ReportSearchMultipleSelectProps<T> = SearchMultipleSelectProps<T> & {
  /** Высота и ширина как у полей даты/времени в модалке. */
  compact?: boolean;
};

export function ReportSearchMultipleSelect<T>({
  onInputChange,
  compact = false,
  sx,
  size,
  ...rest
}: ReportSearchMultipleSelectProps<T>) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  return (
    <SearchMultipleSelect
      {...rest}
      size={size ?? (compact ? 'small' : undefined)}
      overflowTooltip={compact}
      sx={sx ? ([controlSx, sx] as SearchMultipleSelectProps<T>['sx']) : controlSx}
      onInputChange={onInputChange ?? reportFilterNoopInputChange}
    />
  );
}
