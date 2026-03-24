/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarToday, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { Button, Chip, TextField } from '@mui/material';

import { EventsFilterPanel } from '@features/events_filter_panel';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { ID } from '@shared/types/BaseQueryTypes';
import { NativeDateHiddenInput } from '@shared/ui/native_date_hidden_input/NativeDateHiddenInput';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useEventsTable } from '../hooks/useEventsTable';
import { ValuesHeader } from '../lib/getColumns';
import styles from './EventsTable.module.scss';

interface EventsMobileTableProps {
  handleClickRow: (id: string | number) => void;
  handleCloseInfo: () => void;
  prevBranch?: ID;
}

export const EventsMobileTable = ({
  handleClickRow,
  handleCloseInfo,
  prevBranch,
}: EventsMobileTableProps) => {
  const { t } = useTranslation();
  const { filtersData, tableData } = useEventsTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
    if (tableData.changePage) {
      tableData.changePage(0);
    }
  };

  useEffect(() => {
    const resetFiltersListener = () => {
      filtersData.resetFilters();
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

  useEffect(() => {
    if (tableData.changePage) {
      tableData.changePage(0);
    }
  }, [prevBranch]);

  useEffect(() => {
    if (tableData.sortModel) {
      if (tableData.changePage) {
        tableData.changePage(0);
      }
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

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

  const handleRowClick = (row: any) => {
    if (row?.actionId) {
      handleClickRow(row.actionId);
      const rowIndex = tableData.rows.findIndex((r) => r.actionId === row.actionId);
      setSelectedRowIndex(rowIndex);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (tableData.changePage) {
      tableData.changePage(newPage);
    }
    handleCloseInfo();
    setSelectedRowIndex(null);
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

  const formatDateTimeForMobile = (dateString: string, rawDate?: string) => {
    if (rawDate) {
      try {
        let date: Date;
        date = new Date(rawDate);

        if (isNaN(date.getTime())) {
          const cleanDate = rawDate.trim().replace(/\s+/g, ' ');
          date = new Date(cleanDate);
        }

        if (isNaN(date.getTime())) {
          return dateString || 'Дата и время не указаны';
        }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${day}.${month}.${year} ${hours}:${minutes}`;
      } catch {
        return dateString || 'Дата и время не указаны';
      }
    }

    if (!dateString || dateString === '-') return 'Дата и время не указаны';

    if (dateString && !dateString.includes(':')) {
      return `${dateString} 00:00`;
    }

    return dateString;
  };

  const getInitiatorName = (row: any) => {
    const initiator = row.createdBy || row[ValuesHeader.INTITIATOR] || 'Не указан';

    if (typeof initiator === 'string' && initiator.trim()) {
      const parts = initiator.trim().split(/\s+/);
      if (parts.length >= 3) {
        return `${parts[0]} ${parts[1]} ${parts[2]}`;
      } else if (parts.length === 2) {
        return `${parts[0]} ${parts[1]}`;
      }
    }

    return initiator;
  };

  const getChipColor = (typeOfEvent: string) => {
    if (!typeOfEvent) return 'default';

    if (
      typeOfEvent.includes('Ошибка E-') ||
      typeOfEvent.includes('Неразрешенное движение') ||
      typeOfEvent.includes('Тестирование не пройдено') ||
      typeOfEvent.includes('Невозможно заблокировать двигатель, ТС в движении') ||
      typeOfEvent.includes('Фальсификация выдоха')
    ) {
      return 'error';
    }
    if (typeOfEvent.includes('Тестирование пройдено')) {
      return 'success';
    }
    if (typeOfEvent.includes('Тестирование прервано')) {
      return 'warning';
    }
    return 'default';
  };

  // Новая функция для стилей текста на мобильных
  const getTextStyleForEventType = (typeOfEvent: string) => {
    if (!typeOfEvent) return {};

    // Оставляем только цвет текста, убираем фон и рамки
    if (
      typeOfEvent.includes('Ошибка E-') ||
      typeOfEvent.includes('Неразрешенное движение') ||
      typeOfEvent.includes('Тестирование не пройдено') ||
      typeOfEvent.includes('Невозможно заблокировать двигатель, ТС в движении') ||
      typeOfEvent.includes('Фальсификация выдоха')
    ) {
      return {
        color: '#d32f2f',
        fontWeight: '500' as const,
      };
    }
    if (typeOfEvent.includes('Тестирование пройдено')) {
      return {
        color: '#2e7d32',
        fontWeight: '500' as const,
      };
    }
    if (typeOfEvent.includes('Тестирование прервано')) {
      return {
        color: '#ed6c02',
        fontWeight: '500' as const,
      };
    }
    return {
      color: '#333',
    };
  };

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const handleApplyFilters = () => {
    handleFilterChange();
    handleCloseFilterModal();
  };

  const handleClearAllFilters = () => {
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);

    setStartDateInput('');
    setEndDateInput('');
    setStartDateError('');
    setEndDateError('');

    if (startDateNativeRef.current) {
      startDateNativeRef.current.value = '';
    }
    if (endDateNativeRef.current) {
      endDateNativeRef.current.value = '';
    }
  };

  const handleResetAllFilters = () => {
    filtersData.clearDates();
    filtersData.setInput('');
    setStartDateInput('');
    setEndDateInput('');
    setStartDateError('');
    setEndDateError('');

    if (startDateNativeRef.current) {
      startDateNativeRef.current.value = '';
    }
    if (endDateNativeRef.current) {
      endDateNativeRef.current.value = '';
    }

    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);

    handleFilterChange();
  };

  const isMobile = window.innerWidth <= 1024;

  return (
    <div className={styles.tableWrapper}>
      <h1 className={styles.mobileTitle}>{t('nav.events')}</h1>
      <div className={styles.mobileFilters}>
        <SearchInput
          testId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_SEARCH_INPUT}
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
                <NativeDateHiddenInput
                  inputRef={startDateNativeRef}
                  syncedIso={formatDateForNative(filtersData.startDate)}
                  onCommit={(v) => handleNativeDateChange('start', v)}
                  className={styles.hiddenDateInput}
                  style={{ display: 'none' }}
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
                <NativeDateHiddenInput
                  inputRef={endDateNativeRef}
                  syncedIso={formatDateForNative(filtersData.endDate)}
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
            active={filtersData.hasActiveFilters}
            open={filtersData.openFilters}
            toggle={handleOpenFilterModal}
            testid={
              testids.page_attachments.attachments_widget_header
                .ATTACHMENTS_WIDGET_HEADER_FILTER_BUTTON
            }
          />
        </div>
      </div>

      {isFilterModalOpen && (
        <div className={styles.filterModalOverlay} onClick={handleCloseFilterModal}>
          <div className={styles.filterModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.filterModalHeader}>
              <h3>{t('common.filters')}</h3>
              <button
                className={styles.closeModalButton}
                onClick={handleCloseFilterModal}
                aria-label="Закрыть фильтры">
                ×
              </button>
            </div>
            <div className={styles.filterModalBody}>
              <div className={styles.mobileChipContainer}>
                <EventsFilterPanel open={true} onFilterChange={() => {}} />
              </div>
            </div>
            <div className={styles.filterModalFooter}>
              <Button
                variant="outlined"
                onClick={handleClearAllFilters}
                className={styles.clearButton}>
                Очистить фильтры
              </Button>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
                className={styles.applyButton}>
                Применить
              </Button>
            </div>
          </div>
        </div>
      )}

      <EventsFilterPanel open={filtersData.openFilters} onFilterChange={handleFilterChange} />

      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>Нет данных для отображения</div>
        ) : (
          tableData.rows.map((row, index) => (
            <div
              key={row.id}
              className={`${styles.mobileRow} ${
                index === selectedRowIndex ? styles.selectedRow : ''
              }`}
              onClick={() => handleRowClick(row)}>
              <div className={styles.dateTime}>
                {formatDateTimeForMobile(
                  row.dateOccurrent || row[ValuesHeader.DATE_OCCURRENT],
                  (row as any).rawDate,
                )}
              </div>

              <div className={styles.initiator}>{getInitiatorName(row)}</div>

              <div className={styles.rowDetails}>
                {(row.alcoteks || row[ValuesHeader.ALCOLOKS]) && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Алкозамок:</span>
                    <span className={styles.detailValue}>
                      {row.alcoteks || row[ValuesHeader.ALCOLOKS]}
                    </span>
                  </div>
                )}
                {row[ValuesHeader.TC] && row[ValuesHeader.TC] !== '-' && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>{t('tables.vehicleShort')}:</span>
                    <span className={styles.detailValue}>{row[ValuesHeader.TC]}</span>
                  </div>
                )}
                {row[ValuesHeader.TYPE_OF_EVENT] && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Тип:</span>
                    <div className={styles.chipContainer}>
                      {isMobile ? (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            border: '1px solid #e0e0e0',
                            ...getTextStyleForEventType(row[ValuesHeader.TYPE_OF_EVENT]),
                          }}>
                          {row[ValuesHeader.TYPE_OF_EVENT]}
                        </span>
                      ) : (
                        <Chip
                          label={row[ValuesHeader.TYPE_OF_EVENT]}
                          color={getChipColor(row[ValuesHeader.TYPE_OF_EVENT])}
                          size="small"
                          className={styles.eventChip}
                        />
                      )}
                    </div>
                  </div>
                )}
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
          loading={tableData.isLoading}
          onPageChange={handlePageChange}
          buttonClassName={styles.paginationButton}
          infoClassName={styles.paginationInfo}
        />
      </div>
    </div>
  );
};
