import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { flushSync } from 'react-dom';

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
import { normalizeReportFilterSelectValues } from '@pages/reports/lib/reportFilterSelectValues';

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
  /**
   * Произвольная строка в «Значение» фильтра: нормализует freeSolo-string → Value
   * и коммитит набранный текст при blur (Enter в Autocomplete часто не срабатывает).
   * Только для value-контролов; оператор / поле результата не включают.
   */
  commitFreeText?: boolean;
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
  maxValues,
  name,
  blockEmptyClear = false,
  commitFreeText = false,
  label,
  placeholder,
  slotProps,
  overflowTooltip = true,
  onBlur,
  ...rest
}: ReportSearchMultipleSelectProps<T>) {
  const controlSx = compact ? reportFilterModalControlSx : reportFilterControlSx;
  const singleSelect = multiple === false;
  /** Явный clear (крестик) — пропускаем при blockEmptyClear. */
  const permitEmptyClearRef = useRef(false);
  const pendingFreeTextRef = useRef('');
  /** Remount после commit free-text — сбрасывает внутренний inputState Autocomplete. */
  const [freeTextEpoch, setFreeTextEpoch] = useState(0);

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

  const emitValue = useCallback(
    (fieldName: keyof T | string, next: string | Values | Value | (string | Values | Value)[]) => {
      if (!setValueStore) return;
      const payload = commitFreeText ? normalizeReportFilterSelectValues(next) : next;
      setValueStore(fieldName, payload);
    },
    [commitFreeText, setValueStore],
  );

  const guardedSetValueStore: SearchMultipleSelectProps<T>['setValueStore'] = setValueStore
    ? (fieldName, next) => {
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
        if (commitFreeText) {
          pendingFreeTextRef.current = '';
        }
        emitValue(fieldName, next);
      }
    : undefined;

  const commitPendingFreeText = useCallback(() => {
    if (!commitFreeText || !setValueStore) return;
    const text = pendingFreeTextRef.current.trim();
    if (!text) return;
    if (value.some((item) => String(item.value) === text || String(item.label ?? '') === text)) {
      pendingFreeTextRef.current = '';
      return;
    }
    const max = maxValues;
    const atCap = max != null && max > 0 && value.length >= max;
    if (atCap && max !== 1) return;

    const created: Value = { value: text, label: text };
    const next: Values =
      max === 1 || singleSelect ? [created] : atCap ? value : [...value, created];

    pendingFreeTextRef.current = '';
    // sync — чтобы «Сформировать» успела включиться до click (после blur с disabled-кнопки).
    flushSync(() => {
      emitValue(name, next);
      setFreeTextEpoch((epoch) => epoch + 1);
    });
  }, [commitFreeText, setValueStore, value, maxValues, singleSelect, emitValue, name]);

  const handleInputChange = useCallback(
    (next: string) => {
      if (commitFreeText) {
        pendingFreeTextRef.current = next;
      }
      (onInputChange ?? reportFilterNoopInputChange)(next);
    },
    [commitFreeText, onInputChange],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      onBlur?.(event);
      commitPendingFreeText();
    },
    [onBlur, commitPendingFreeText],
  );

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
        key={commitFreeText ? `${String(name)}__ft_${freeTextEpoch}` : undefined}
        name={name}
        label={label}
        placeholder={placeholder}
        multiple={multiple}
        maxValues={maxValues}
        value={value}
        size={size ?? (compact ? 'small' : undefined)}
        overflowTooltip={overflowTooltip}
        sx={mergedSx}
        // Не передаём clearIndicator-обработчики — иначе ломается clear MUI.
        slotProps={slotProps}
        onInputChange={handleInputChange}
        onBlur={handleBlur}
        setValueStore={guardedSetValueStore}
      />
    </div>
  );
}
