import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import { CalendarToday, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { Button, TextField } from '@mui/material';

import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { NativeDateHiddenInput } from '@shared/ui/native_date_hidden_input/NativeDateHiddenInput';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { FilterButton } from '@shared/ui/table_filter_button';
import eventTableStyles from '@widgets/events_table/ui/EventsTable.module.scss';

import { reportsFiltersStore } from '../model/reportsFiltersStore';
import { ReportsFilterPanel } from './ReportsFilterPanel';

type ReportsMobileToolbarProps = {
  onCreateReport: () => void;
  onResetFilters: () => void;
  isGenerating: boolean;
};

const modalSecondaryButtonSx = {
  flex: 1,
  textTransform: 'none' as const,
  fontWeight: 500,
  borderColor: 'divider',
  color: 'text.secondary',
  '&:hover': {
    borderColor: 'text.disabled',
    backgroundColor: 'action.hover',
  },
};

export function ReportsMobileToolbar({
  onCreateReport,
  onResetFilters,
  isGenerating,
}: ReportsMobileToolbarProps) {
  const { t } = useTranslation();
  const styles = eventTableStyles;

  const startDate = reportsFiltersStore((s) => s.startDate);
  const endDate = reportsFiltersStore((s) => s.endDate);
  const setStartDate = reportsFiltersStore((s) => s.setStartDate);
  const setEndDate = reportsFiltersStore((s) => s.setEndDate);
  const hasActiveFilters = reportsFiltersStore((s) => s.hasActiveFilters);

  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const startDateNativeRef = useRef<HTMLInputElement>(null);
  const endDateNativeRef = useRef<HTMLInputElement>(null);

  const formatDateForDisplay = (d: Dayjs | null): string => {
    if (!d || !d.isValid()) return '';
    return d.format('DD.MM.YYYY');
  };

  const formatDateForNative = (d: Dayjs | null): string => {
    if (!d || !d.isValid()) return '';
    return d.format('YYYY-MM-DD');
  };

  useEffect(() => {
    setStartDateInput(formatDateForDisplay(startDate));
    setStartDateError('');
  }, [startDate]);

  useEffect(() => {
    setEndDateInput(formatDateForDisplay(endDate));
    setEndDateError('');
  }, [endDate]);

  const parseDateFromInput = (inputValue: string): Dayjs | null => {
    if (!inputValue || inputValue.length < 10) return null;
    const [dayStr, monthStr, yearStr] = inputValue.split('.');
    const day = Number(dayStr);
    const month = Number(monthStr);
    const year = Number(yearStr);
    if (year < 1900 || year > 2100) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day > daysInMonth) return null;
    const parsed = dayjs(new Date(year, month - 1, day));
    return parsed.isValid() ? parsed : null;
  };

  const applyDateMask = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    let result = '';
    for (let i = 0; i < numbers.length; i++) {
      if (i === 2 || i === 4) {
        result += '.';
      }
      if (i >= 8) break;
      result += numbers[i];
    }
    return result;
  };

  const validateDateInput = (value: string): string => {
    if (!value) return '';
    if (!/^\d{2}\.\d{2}\.\d{4}$/.test(value)) {
      return t('validation.notValidData');
    }
    const date = parseDateFromInput(value);
    if (!date) return t('validation.notValidData');
    return '';
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyDateMask(e.target.value);
    setStartDateInput(maskedValue);
    if (maskedValue.length === 10) {
      const error = validateDateInput(maskedValue);
      setStartDateError(error);
      if (!error) {
        const d = parseDateFromInput(maskedValue);
        if (d) setStartDate(d);
      }
    } else if (maskedValue.length === 0) {
      setStartDate(null);
      setStartDateError('');
    } else {
      setStartDateError('');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maskedValue = applyDateMask(e.target.value);
    setEndDateInput(maskedValue);
    if (maskedValue.length === 10) {
      const error = validateDateInput(maskedValue);
      setEndDateError(error);
      if (!error) {
        const d = parseDateFromInput(maskedValue);
        if (d) setEndDate(d);
      }
    } else if (maskedValue.length === 0) {
      setEndDate(null);
      setEndDateError('');
    } else {
      setEndDateError('');
    }
  };

  const handleStartDateBlur = () => {
    if (startDateInput && startDateInput.length < 10) {
      setStartDateInput(formatDateForDisplay(startDate));
      setStartDateError('');
    } else if (startDateInput && startDateInput.length === 10 && startDateError) {
      setStartDateInput('');
      setStartDate(null);
      setStartDateError('');
    }
  };

  const handleEndDateBlur = () => {
    if (endDateInput && endDateInput.length < 10) {
      setEndDateInput(formatDateForDisplay(endDate));
      setEndDateError('');
    } else if (endDateInput && endDateInput.length === 10 && endDateError) {
      setEndDateInput('');
      setEndDate(null);
      setEndDateError('');
    }
  };

  const handleNativeDateChange = (type: 'start' | 'end', value: string) => {
    if (value) {
      const parsed = dayjs(value);
      if (parsed.isValid()) {
        if (type === 'start') {
          setStartDate(parsed);
          setStartDateInput(formatDateForDisplay(parsed));
          setStartDateError('');
        } else {
          setEndDate(parsed);
          setEndDateInput(formatDateForDisplay(parsed));
          setEndDateError('');
        }
      }
    } else {
      if (type === 'start') {
        setStartDate(null);
        setStartDateInput('');
        setStartDateError('');
      } else {
        setEndDate(null);
        setEndDateInput('');
        setEndDateError('');
      }
    }
  };

  const handleOpenCalendar = (type: 'start' | 'end') => {
    if (type === 'start') {
      openNativeDatePickerFromHiddenInput(startDateNativeRef.current);
    } else {
      openNativeDatePickerFromHiddenInput(endDateNativeRef.current);
    }
  };

  const handleClearStartDate = () => {
    setStartDateInput('');
    setStartDate(null);
    setStartDateError('');
    if (startDateNativeRef.current) startDateNativeRef.current.value = '';
  };

  const handleClearEndDate = () => {
    setEndDateInput('');
    setEndDate(null);
    setEndDateError('');
    if (endDateNativeRef.current) endDateNativeRef.current.value = '';
  };

  const handleResetAllToolbar = () => {
    onResetFilters();
    if (startDateNativeRef.current) startDateNativeRef.current.value = '';
    if (endDateNativeRef.current) endDateNativeRef.current.value = '';
  };

  const handleClearFiltersInModal = () => {
    onResetFilters();
    setIsFilterModalOpen(false);
  };

  const handleCreateReportFromModal = () => {
    setIsFilterModalOpen(false);
    onCreateReport();
  };

  return (
    <div className={styles.mobileFilters}>
      <div className={styles.dateFiltersRow}>
        <div className={styles.dateFiltersToggle}>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setShowDateFilters(!showDateFilters)}>
            <span>{t('filtersByDate')}</span>
            {showDateFilters ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </button>
        </div>
        <div className={styles.resetFiltersContainer}>
          <ResetFilters reset={handleResetAllToolbar} />
        </div>
      </div>

      {showDateFilters && (
        <div className={styles.customDateInputs}>
          <div className={styles.dateFieldsContainer}>
            <div className={styles.dateFieldContainer}>
              <TextField
                label={t('history.startDate')}
                type="text"
                placeholder={t('datePlaceholder')}
                value={startDateInput}
                onChange={handleStartDateChange}
                onBlur={handleStartDateBlur}
                size="small"
                className={styles.narrowDateField}
                error={!!startDateError}
                helperText={startDateError}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  'data-testid':
                    testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE,
                  inputMode: 'numeric',
                  pattern: '[0-9.]*',
                  maxLength: 10,
                }}
              />
              <button
                type="button"
                className={styles.calendarButton}
                onClick={() => handleOpenCalendar('start')}
                aria-label={t('history.startDate')}>
                <CalendarToday fontSize="small" />
              </button>
              {startDateInput && (
                <button
                  type="button"
                  className={styles.clearDateButton}
                  onClick={handleClearStartDate}
                  aria-label={t('common.reset')}>
                  ×
                </button>
              )}
              <NativeDateHiddenInput
                inputRef={startDateNativeRef}
                syncedIso={formatDateForNative(startDate)}
                onCommit={(v) => handleNativeDateChange('start', v)}
                className={styles.hiddenDateInput}
                style={{ display: 'none' }}
              />
            </div>

            <div className={styles.dateFieldContainer}>
              <TextField
                label={t('history.endDate')}
                type="text"
                placeholder={t('datePlaceholder')}
                value={endDateInput}
                onChange={handleEndDateChange}
                onBlur={handleEndDateBlur}
                size="small"
                className={styles.narrowDateField}
                error={!!endDateError}
                helperText={endDateError}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  'data-testid':
                    testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE,
                  inputMode: 'numeric',
                  pattern: '[0-9.]*',
                  maxLength: 10,
                }}
              />
              <button
                type="button"
                className={styles.calendarButton}
                onClick={() => handleOpenCalendar('end')}
                aria-label={t('history.endDate')}>
                <CalendarToday fontSize="small" />
              </button>
              {endDateInput && (
                <button
                  type="button"
                  className={styles.clearDateButton}
                  onClick={handleClearEndDate}
                  aria-label={t('common.reset')}>
                  ×
                </button>
              )}
              <NativeDateHiddenInput
                inputRef={endDateNativeRef}
                syncedIso={formatDateForNative(endDate)}
                onCommit={(v) => handleNativeDateChange('end', v)}
                className={styles.hiddenDateInput}
                style={{ display: 'none' }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={styles.filterActions}>
        <FilterButton
          active={hasActiveFilters}
          open={isFilterModalOpen}
          toggle={() => setIsFilterModalOpen(true)}
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_BUTTON
          }
        />
      </div>

      {isFilterModalOpen && (
        <div
          className={styles.filterModalOverlay}
          onClick={() => setIsFilterModalOpen(false)}
          role="presentation">
          <div
            className={styles.filterModalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reports-filters-modal-title">
            <div className={styles.filterModalHeader}>
              <h3 id="reports-filters-modal-title">{t('common.filters')}</h3>
              <button
                type="button"
                className={styles.closeModalButton}
                onClick={() => setIsFilterModalOpen(false)}
                aria-label={t('common.closeWindow')}>
                ×
              </button>
            </div>
            <div className={styles.filterModalBody}>
              <ReportsFilterPanel layout="stacked" />
            </div>
            <div className={styles.filterModalFooter}>
              <Button
                variant="outlined"
                color="inherit"
                onClick={handleClearFiltersInModal}
                sx={modalSecondaryButtonSx}>
                {t('common.clearFilters')}
              </Button>
              <Button
                variant="outlined"
                disabled={isGenerating}
                onClick={handleCreateReportFromModal}
                sx={(theme) => ({
                  flex: 1,
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '14px',
                  letterSpacing: '0.1px',
                  borderRadius: '10px',
                  bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#ffffff',
                  borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.16)' : '#e0e0e0',
                  color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.87)' : '#333333',
                  '&:hover': {
                    bgcolor:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.04)',
                    borderColor:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.22)' : '#bdbdbd',
                  },
                  '&.Mui-disabled': {
                    borderColor:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : '#e0e0e0',
                    color:
                      theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.26)',
                  },
                })}>
                {t('reports.createReport')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
