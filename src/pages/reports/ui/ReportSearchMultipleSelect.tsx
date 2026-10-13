import {
  SearchMultipleSelect,
  type SearchMultipleSelectProps,
  type Value,
  type Values,
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

function isEmptySelectValue(next: string | Values | Value | (string | Values | Value)[]): boolean {
  if (next == null || next === '') return true;
  if (Array.isArray(next)) return next.length === 0;
  return false;
}

/**
 * Обёртка только для отчётов: гасит ложный clear single-select от MUI
 * (blur / закрытие Popup / перерисовка), не меняя shared SearchMultipleSelect.
 * Полный сброс «Поле результата» — кнопкой удаления строки фильтра.
 */
export function ReportSearchMultipleSelect<T>({
  onInputChange,
  compact = false,
  sx,
  size,
  setValueStore,
  value = [],
  multiple,
  ...rest
}: ReportSearchMultipleSelectProps<T>) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const singleSelect = multiple === false;

  const guardedSetValueStore: SearchMultipleSelectProps<T>['setValueStore'] = setValueStore
    ? (name, next) => {
        if (singleSelect && isEmptySelectValue(next) && value.length > 0) {
          return;
        }
        setValueStore(name, next);
      }
    : undefined;

  return (
    <SearchMultipleSelect
      {...rest}
      multiple={multiple}
      value={value}
      size={size ?? (compact ? 'small' : undefined)}
      overflowTooltip={compact}
      sx={sx ? ([controlSx, sx] as SearchMultipleSelectProps<T>['sx']) : controlSx}
      onInputChange={onInputChange ?? reportFilterNoopInputChange}
      setValueStore={guardedSetValueStore}
    />
  );
}
