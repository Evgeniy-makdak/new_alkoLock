import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import CalendarToday from '@mui/icons-material/CalendarToday';
import KeyboardArrowDown from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUp from '@mui/icons-material/KeyboardArrowUp';
import { TextField } from '@mui/material';

import { NativeDateHiddenInput } from '@shared/ui/native_date_hidden_input/NativeDateHiddenInput';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';

import styles from './HiddenFiltersOfDates.module.scss';

type HiddenFiltersOfDatesProps = {
  isOpen: boolean;
  onToggle: () => void;
  onReset: () => void;
  /** Содержимое справа от полей дат (например «сбросить все фильтры»). Растягивает блок дат на доступную ширину. */
  fieldsEndSlot?: ReactNode;
  startLabel?: string;
  endLabel?: string;
  startPlaceholder: string;
  endPlaceholder: string;
  startValue: string;
  endValue: string;
  startError?: string;
  endError?: string;
  onStartChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEndChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStartBlur: () => void;
  onEndBlur: () => void;
  onOpenStartCalendar: () => void;
  onOpenEndCalendar: () => void;
  onClearStart: () => void;
  onClearEnd: () => void;
  startDateTestId?: string;
  endDateTestId?: string;
  startDateInputRef: React.RefObject<HTMLInputElement>;
  endDateInputRef: React.RefObject<HTMLInputElement>;
  startDateIso: string;
  endDateIso: string;
  onStartNativeCommit: (value: string) => void;
  onEndNativeCommit: (value: string) => void;
  hideToggleRow?: boolean;
  hideResetButton?: boolean;
  forceExpanded?: boolean;
};

export const HiddenFiltersOfDates = ({
  isOpen,
  onToggle,
  onReset,
  startLabel = 'Начальная дата',
  endLabel = 'Конечная дата',
  startPlaceholder,
  endPlaceholder,
  startValue,
  endValue,
  startError,
  endError,
  onStartChange,
  onEndChange,
  onStartBlur,
  onEndBlur,
  onOpenStartCalendar,
  onOpenEndCalendar,
  onClearStart,
  onClearEnd,
  startDateTestId,
  endDateTestId,
  startDateInputRef,
  endDateInputRef,
  startDateIso,
  endDateIso,
  onStartNativeCommit,
  onEndNativeCommit,
  hideToggleRow = false,
  hideResetButton = false,
  forceExpanded = false,
  fieldsEndSlot,
}: HiddenFiltersOfDatesProps) => {
  const { t, i18n } = useTranslation();
  const expanded = forceExpanded || isOpen;
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const [toggleColumnWidth, setToggleColumnWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (hideToggleRow) {
      setToggleColumnWidth(null);
      return;
    }
    const btn = toggleButtonRef.current;
    if (!btn) return;

    const measure = () => {
      setToggleColumnWidth(Math.round(btn.getBoundingClientRect().width));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(btn);
    return () => ro.disconnect();
  }, [hideToggleRow, i18n.language, isOpen]);

  const fieldsInner = (
    <div className={styles.fields}>
      <div className={styles.fieldRow}>
        <TextField
          label={startLabel}
          type="text"
          placeholder={startPlaceholder}
          value={startValue}
          onChange={onStartChange}
          onBlur={onStartBlur}
          size="small"
          margin="none"
          className={styles.field}
          error={Boolean(startError)}
          helperText={startError}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            'data-testid': startDateTestId,
            inputMode: 'numeric',
            pattern: '[0-9.]*',
            maxLength: 10,
          }}
        />
        <button
          type="button"
          className={styles.calendarButton}
          onClick={onOpenStartCalendar}
          aria-label="Открыть календарь для выбора начальной даты">
          <CalendarToday fontSize="small" />
        </button>
        {startValue && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClearStart}
            aria-label="Очистить начальную дату">
            ×
          </button>
        )}
        <NativeDateHiddenInput
          inputRef={startDateInputRef}
          syncedIso={startDateIso}
          onCommit={onStartNativeCommit}
          className={styles.hiddenDateInput}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.fieldRow}>
        <TextField
          label={endLabel}
          type="text"
          placeholder={endPlaceholder}
          value={endValue}
          onChange={onEndChange}
          onBlur={onEndBlur}
          size="small"
          margin="none"
          className={styles.field}
          error={Boolean(endError)}
          helperText={endError}
          InputLabelProps={{ shrink: true }}
          inputProps={{
            'data-testid': endDateTestId,
            inputMode: 'numeric',
            pattern: '[0-9.]*',
            maxLength: 10,
          }}
        />
        <button
          type="button"
          className={styles.calendarButton}
          onClick={onOpenEndCalendar}
          aria-label="Открыть календарь для выбора конечной даты">
          <CalendarToday fontSize="small" />
        </button>
        {endValue && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClearEnd}
            aria-label="Очистить конечную дату">
            ×
          </button>
        )}
        <NativeDateHiddenInput
          inputRef={endDateInputRef}
          syncedIso={endDateIso}
          onCommit={onEndNativeCommit}
          className={styles.hiddenDateInput}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );

  return (
    <div className={[styles.container, hideToggleRow ? styles.containerNoToggle : ''].join(' ').trim()}>
      {!hideToggleRow && (
        <div className={styles.row}>
          <div
            className={styles.toggleStack}
            style={
              !hideToggleRow
                ? toggleColumnWidth != null
                  ? { width: toggleColumnWidth }
                  : { maxWidth: 240 }
                : undefined
            }>
            <div className={styles.toggleWrap}>
              <button
                ref={toggleButtonRef}
                type="button"
                className={[
                  styles.toggleButton,
                  toggleColumnWidth != null ? styles.toggleButtonFill : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={onToggle}>
                <span>{t('filtersByDate')}</span>
                {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
              </button>
            </div>
            {expanded && <div className={styles.expandedInStack}>{fieldsInner}</div>}
          </div>

          {!hideResetButton && (
            <div className={styles.resetWrap}>
              <ResetFilters reset={onReset} />
            </div>
          )}
        </div>
      )}

      {hideToggleRow && expanded && (
        <div className={fieldsEndSlot ? styles.expandedWithSlot : styles.expandedPanelOnly}>
          {fieldsEndSlot ? (
            <>
              <div className={styles.expandedGrow}>{fieldsInner}</div>
              <div className={styles.fieldsEndSlot}>{fieldsEndSlot}</div>
            </>
          ) : (
            fieldsInner
          )}
        </div>
      )}
    </div>
  );
};
