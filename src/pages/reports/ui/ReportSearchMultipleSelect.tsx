import { useMemo, useRef, type MouseEvent as ReactMouseEvent } from 'react';

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

/** Outlined label абсолютно позиционирован — ширина контрола должна вмещать текст лейбла. */
function estimateReportControlMinWidth(
  label: SearchMultipleSelectProps<unknown>['label'],
  placeholder: SearchMultipleSelectProps<unknown>['placeholder'],
  compact: boolean,
): number {
  const base = compact ? 200 : 160;
  const text = [label, placeholder]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)[0];
  if (!text) return base;
  // ~8.2px/символ (14px) + место под clear/popup и отступы outlined.
  return Math.max(base, Math.min(560, Math.ceil(text.length * 8.2) + 72));
}

function isClearIndicatorTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('.MuiAutocomplete-clearIndicator'));
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
  label,
  placeholder,
  slotProps,
  ...rest
}: ReportSearchMultipleSelectProps<T>) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const singleSelect = multiple === false;
  /** Явный clear (крестик) — пропускаем при blockEmptyClear. */
  const permitEmptyClearRef = useRef(false);

  const minWidthPx = estimateReportControlMinWidth(label, placeholder, compact);
  const widthSx = useMemo(
    () => ({
      minWidth: minWidthPx,
      width: 'max-content',
      maxWidth: '100%',
      '& .MuiFormControl-root': {
        minWidth: minWidthPx,
        width: 'max-content',
        maxWidth: '100%',
      },
      '& .MuiAutocomplete-root': {
        minWidth: minWidthPx,
        width: 'max-content',
        maxWidth: '100%',
      },
      '& .MuiOutlinedInput-root': {
        minWidth: minWidthPx,
        width: 'max-content',
        maxWidth: '100%',
      },
    }),
    [minWidthPx],
  );

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

  /**
   * Нельзя вешать onClick/onMouseDown в slotProps.clearIndicator:
   * в MUI Autocomplete они идут после getClearProps() и полностью затирают очистку.
   * Ловим крестик на capture у обёртки — getClearProps остаётся нетронутым.
   */
  const onClearIntentCapture = (event: ReactMouseEvent) => {
    if (!blockEmptyClear) return;
    if (isClearIndicatorTarget(event.target)) {
      permitEmptyClearRef.current = true;
    }
  };

  const mergedSx = useMemo(() => {
    const parts = [controlSx, widthSx, sx].filter(Boolean);
    if (parts.length === 1) return parts[0] as SearchMultipleSelectProps<T>['sx'];
    return parts as SearchMultipleSelectProps<T>['sx'];
  }, [controlSx, widthSx, sx]);

  return (
    <div
      onMouseDownCapture={onClearIntentCapture}
      onPointerDownCapture={(event) => {
        if (!blockEmptyClear) return;
        if (isClearIndicatorTarget(event.target)) {
          permitEmptyClearRef.current = true;
        }
      }}
      style={{
        display: 'block',
        width: '100%',
        minWidth: minWidthPx,
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}>
      <SearchMultipleSelect
        {...rest}
        label={label}
        placeholder={placeholder}
        multiple={multiple}
        value={value}
        size={size ?? (compact ? 'small' : undefined)}
        overflowTooltip={false}
        sx={mergedSx}
        // Не передаём clearIndicator-обработчики — иначе ломается clear MUI.
        slotProps={slotProps}
        onInputChange={onInputChange ?? reportFilterNoopInputChange}
        setValueStore={guardedSetValueStore}
      />
    </div>
  );
}
