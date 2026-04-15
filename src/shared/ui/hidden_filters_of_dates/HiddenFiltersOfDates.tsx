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
}: HiddenFiltersOfDatesProps) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.toggleWrap}>
          <button type="button" className={styles.toggleButton} onClick={onToggle}>
            <span>{t('filtersByDate')}</span>
            {isOpen ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </button>
        </div>

        <div className={styles.resetWrap}>
          <ResetFilters reset={onReset} />
        </div>
      </div>

      {isOpen && (
        <div className={styles.expanded}>
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
        </div>
      )}
    </div>
  );
};
