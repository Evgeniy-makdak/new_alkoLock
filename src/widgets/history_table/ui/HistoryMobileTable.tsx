/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarToday, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { TextField } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { ID } from '@shared/types/BaseQueryTypes';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { useHistoryTable } from '../hooks/useHistoryTable';
import styles from './HistoryTable.module.scss';

interface HistoryMobileTableProps {
  prevBranch: ID;
}

export const HistoryMobileTable = ({ prevBranch }: HistoryMobileTableProps) => {
  const { t } = useTranslation();
  const { filtersData, tableData } = useHistoryTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const { resetStatusFilter } = useStatusFilter();

  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [showDateFilters, setShowDateFilters] = useState(false);

  const startDateNativeRef = useRef<HTMLInputElement>(null);
  const endDateNativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (filtersData.startDate) {
      setStartDateInput(formatDateForDisplay(filtersData.startDate));
      setStartDateError('');
    } else {
      setStartDateInput('');
      setStartDateError('');
    }
  }, [filtersData.startDate]);

  useEffect(() => {
    if (filtersData.endDate) {
      setEndDateInput(formatDateForDisplay(filtersData.endDate));
      setEndDateError('');
    } else {
      setEndDateInput('');
      setEndDateError('');
    }
  }, [filtersData.endDate]);

  const handleFilterChange = () => {
    setIsFiltersChanged(true);
    tableData.setPage(0);
  };

  useEffect(() => {
    tableData.setPage(0);
  }, [prevBranch]);

  useEffect(() => {
    if (tableData.sortModel) {
      tableData.setPage(0);
    }
  }, [tableData.sortModel]);

  useEffect(() => {
    if (isFiltersChanged && prevRowCountRef.current !== tableData.totalCount) {
      prevRowCountRef.current = tableData.totalCount;
      setIsFiltersChanged(false);
    }
  }, [tableData.totalCount, isFiltersChanged]);

  useEffect(() => {
    if (pageSize.current !== tableData.pageSize) {
      pageSize.current = tableData.pageSize;
      handleFilterChange();
    }
  }, [tableData.pageSize]);

  const handlePageChange = (newPage: number) => {
    tableData.setPage(newPage);
  };

  const handleResetAllFilters = () => {
    filtersData.clearDates();
    filtersData.setInput('');
    resetStatusFilter();
    handleFilterChange();
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);
  };

  const formatDateForDisplay = (date: any): string => {
    if (!date) return '';

    try {
      if (date?.isValid?.() && date?.format) {
        return date.format('DD.MM.YYYY');
      }
      if (date instanceof Date && !isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      }

      return '';
    } catch {
      return '';
    }
  };

  const formatDateForNative = (date: any): string => {
    if (!date) return '';

    try {
      if (date?.isValid?.() && date?.format) {
        return date.format('YYYY-MM-DD');
      }

      if (date instanceof Date && !isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }

      return '';
    } catch {
      return '';
    }
  };

  const parseDateFromInput = (inputValue: string): Date | null => {
    if (!inputValue || inputValue.length < 10) return null;

    try {
      const [dayStr, monthStr, yearStr] = inputValue.split('.');
      const day = Number(dayStr);
      const month = Number(monthStr);
      const year = Number(yearStr);

      if (year < 1900 || year > 2100) return null;
      if (month < 1 || month > 12) return null;
      if (day < 1 || day > 31) return null;

      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) return null;

      const date = new Date(year, month - 1, day);

      if (isNaN(date.getTime())) return null;

      return date;
    } catch {
      return null;
    }
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
      return 'Неверный формат даты';
    }

    const date = parseDateFromInput(value);
    if (!date) {
      return 'Некорректная дата';
    }

    return '';
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maskedValue = applyDateMask(value);

    setStartDateInput(maskedValue);

    if (maskedValue.length === 10) {
      const error = validateDateInput(maskedValue);
      setStartDateError(error);

      if (!error) {
        const date = parseDateFromInput(maskedValue);
        if (date) {
          filtersData.changeStartDate(date as any);
          handleFilterChange();
        }
      }
    } else if (maskedValue.length === 0) {
      filtersData.changeStartDate(null);
      handleFilterChange();
      setStartDateError('');
    } else {
      setStartDateError('');
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maskedValue = applyDateMask(value);

    setEndDateInput(maskedValue);

    if (maskedValue.length === 10) {
      const error = validateDateInput(maskedValue);
      setEndDateError(error);

      if (!error) {
        const date = parseDateFromInput(maskedValue);
        if (date) {
          filtersData.changeEndDate(date as any);
          handleFilterChange();
        }
      }
    } else if (maskedValue.length === 0) {
      filtersData.changeEndDate(null);
      handleFilterChange();
      setEndDateError('');
    } else {
      setEndDateError('');
    }
  };

  const handleStartDateBlur = () => {
    if (startDateInput && startDateInput.length < 10) {
      setStartDateInput(formatDateForDisplay(filtersData.startDate));
      setStartDateError('');
    } else if (startDateInput && startDateInput.length === 10 && startDateError) {
      setStartDateInput('');
      filtersData.changeStartDate(null);
      setStartDateError('');
      handleFilterChange();
    }
  };

  const handleEndDateBlur = () => {
    if (endDateInput && endDateInput.length < 10) {
      setEndDateInput(formatDateForDisplay(filtersData.endDate));
      setEndDateError('');
    } else if (endDateInput && endDateInput.length === 10 && endDateError) {
      setEndDateInput('');
      filtersData.changeEndDate(null);
      setEndDateError('');
      handleFilterChange();
    }
  };

  const handleNativeDateChange = (type: 'start' | 'end', value: string) => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        if (type === 'start') {
          filtersData.changeStartDate(date as any);
          setStartDateInput(formatDateForDisplay(date));
          setStartDateError('');
        } else {
          filtersData.changeEndDate(date as any);
          setEndDateInput(formatDateForDisplay(date));
          setEndDateError('');
        }
        handleFilterChange();
      }
    } else {
      if (type === 'start') {
        filtersData.changeStartDate(null);
        setStartDateInput('');
        setStartDateError('');
      } else {
        filtersData.changeEndDate(null);
        setEndDateInput('');
        setEndDateError('');
      }
      handleFilterChange();
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
    filtersData.changeStartDate(null);
    setStartDateError('');
    handleFilterChange();
  };

  const handleClearEndDate = () => {
    setEndDateInput('');
    filtersData.changeEndDate(null);
    setEndDateError('');
    handleFilterChange();
  };

  const getEventValue = (row: any, field: string) => {
    switch (field) {
      case 'date':
        return row.CREATED_AT || '-';
      case 'alcolock':
        return row.ALCOLOKS || '-';
      case 'eventType':
        return row.TYPE_OF_EVENT || '-';
      case 'initiator':
        return row.INITIATOR || '-';
      case 'handler':
        return row.HANDLER || '-';
      case 'vehicle':
        return row.TC || '-';
      default:
        return '-';
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <h2 className={styles.mobileTitle}>{t('nav.serviceModeHistory')}</h2>
      </div>

      <div className={styles.mobileFilters}>
        <SearchInput
          testId={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            handleFilterChange();
          }}
          setState={(value) => {
            filtersData.setInput(value);
            handleFilterChange();
          }}
        />

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
            <ResetFilters reset={handleResetAllFilters} />
          </div>
        </div>

        {showDateFilters && (
          <div className={styles.customDateInputs}>
            <div className={styles.dateFieldsContainer}>
              <div className={styles.dateFieldContainer}>
                <TextField
                  label="Начальная дата"
                  type="text"
                  placeholder={t('datePlaceholder')}
                  value={startDateInput}
                  onChange={handleStartDateChange}
                  onBlur={handleStartDateBlur}
                  size="small"
                  className={styles.narrowDateField}
                  error={!!startDateError}
                  helperText={startDateError}
                  InputLabelProps={{
                    shrink: true,
                  }}
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
                  aria-label="Открыть календарь для выбора начальной даты">
                  <CalendarToday fontSize="small" />
                </button>
                {startDateInput && (
                  <button
                    type="button"
                    className={styles.clearDateButton}
                    onClick={handleClearStartDate}
                    aria-label="Очистить начальную дату">
                    ×
                  </button>
                )}
                <input
                  ref={startDateNativeRef}
                  type="date"
                  value={formatDateForNative(filtersData.startDate)}
                  onChange={(e) => handleNativeDateChange('start', e.target.value)}
                  className={styles.hiddenDateInput}
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
              </div>

              <div className={styles.dateFieldContainer}>
                <TextField
                  label="Конечная дата"
                  type="text"
                  placeholder={t('datePlaceholder')}
                  value={endDateInput}
                  onChange={handleEndDateChange}
                  onBlur={handleEndDateBlur}
                  size="small"
                  className={styles.narrowDateField}
                  error={!!endDateError}
                  helperText={endDateError}
                  InputLabelProps={{
                    shrink: true,
                  }}
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
                  aria-label="Открыть календарь для выбора конечной даты">
                  <CalendarToday fontSize="small" />
                </button>
                {endDateInput && (
                  <button
                    type="button"
                    className={styles.clearDateButton}
                    onClick={handleClearEndDate}
                    aria-label="Очистить конечную дату">
                    ×
                  </button>
                )}
                <input
                  ref={endDateNativeRef}
                  type="date"
                  value={formatDateForNative(filtersData.endDate)}
                  onChange={(e) => handleNativeDateChange('end', e.target.value)}
                  className={styles.hiddenDateInput}
                  style={{ display: 'none' }}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>Нет данных для отображения</div>
        ) : (
          tableData.rows.map((row) => (
            <div key={row.id} className={styles.mobileRow}>
              <div className={styles.rowMainInfo}>
                <div className={styles.eventInfo}>
                  <div className={styles.eventType}>{getEventValue(row, 'eventType')}</div>
                  <div className={styles.eventDate}>{getEventValue(row, 'date')}</div>
                </div>
              </div>

              <div className={styles.rowDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Алкозамок:</span>
                  <span className={styles.detailValue}>{getEventValue(row, 'alcolock')}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Инициатор:</span>
                  <span className={styles.detailValue}>{getEventValue(row, 'initiator')}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Исполнитель:</span>
                  <span className={styles.detailValue}>{getEventValue(row, 'handler')}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('tables.vehicleShort')}:</span>
                  <span className={styles.detailValue}>{getEventValue(row, 'vehicle')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className={styles.mobilePagination}>
        <MobilePaginationWithJump
          page={tableData.page}
          pageSize={tableData.pageSize}
          totalCount={tableData.totalCount}
          onPageChange={handlePageChange}
          buttonClassName={styles.paginationButton}
          infoClassName={styles.paginationInfo}
        />
      </div>
    </div>
  );
};
