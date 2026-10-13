import { useMemo, useRef } from 'react';

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
  /**
   * true — игнорировать пустой onChange при уже выбранном значении
   * (ложный clear MUI на «Поле результата»), кроме явного clear-индикатора.
   */
  blockEmptyClear?: boolean;
};

function isEmptySelectValue(next: string | Values | Value | (string | Values | Value)[]): boolean {
  if (next == null || next === '') return true;
  if (Array.isArray(next)) return next.length === 0;
  return false;
}

export function ReportSearchMultipleSelect<T>({
  onInputChange,
  compact = false,
  sx,
  size,
  setValueStore,
  value = [],
  multiple,
  blockEmptyClear = false,
  slotProps,
  ...rest
}: ReportSearchMultipleSelectProps<T>) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const singleSelect = multiple === false;
  /** Явный clear (крестик) — пропускаем при blockEmptyClear. */
  const permitEmptyClearRef = useRef(false);

  const guardedSetValueStore: SearchMultipleSelectProps<T>['setValueStore'] = setValueStore
    ? (name, next) => {
        if (
          blockEmptyClear &&
          singleSelect &&
          isEmptySelectValue(next) &&
          value.length > 0 &&
          !permitEmptyClearRef.current
        ) {
          return;
        }
        permitEmptyClearRef.current = false;
        setValueStore(name, next);
      }
    : undefined;

  const mergedSlotProps = useMemo(() => {
    if (!blockEmptyClear) return slotProps;
    return {
      ...slotProps,
      clearIndicator: {
        onMouseDown: () => {
          permitEmptyClearRef.current = true;
        },
        onClick: () => {
          permitEmptyClearRef.current = true;
        },
      },
    };
  }, [blockEmptyClear, slotProps]);

  return (
    <SearchMultipleSelect
      {...rest}
      multiple={multiple}
      value={value}
      size={size ?? (compact ? 'small' : undefined)}
      overflowTooltip={compact}
      sx={sx ? ([controlSx, sx] as SearchMultipleSelectProps<T>['sx']) : controlSx}
      slotProps={mergedSlotProps}
      onInputChange={onInputChange ?? reportFilterNoopInputChange}
      setValueStore={guardedSetValueStore}
    />
  );
}
