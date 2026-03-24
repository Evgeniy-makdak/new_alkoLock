/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CalendarToday, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import { Chip, TextField } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useAvtoServiceTable } from '../hooks/useAvtoServiceTable';
import styles from './AvtoServiceTable.module.scss';

interface AvtoServiceMobileTableProps {
  handleClickRow: (id: string | number, idDevice: string | number) => void;
  handleCloseAside: () => void;
}

export const AvtoServiceMobileTable = ({
  handleClickRow,
  handleCloseAside,
}: AvtoServiceMobileTableProps) => {
  const { t } = useTranslation();
  const { filterData, tableData, refetch } = useAvtoServiceTable();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [showDateFilters, setShowDateFilters] = useState(false);

  const startDateNativeRef = useRef<HTMLInputElement>(null);
  const endDateNativeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (filterData.startDate) {
      setStartDateInput(formatDateForDisplay(filterData.startDate));
      setStartDateError('');
    } else {
      setStartDateInput('');
      setStartDateError('');
    }
  }, [filterData.startDate]);

  useEffect(() => {
    if (filterData.endDate) {
      setEndDateInput(formatDateForDisplay(filterData.endDate));
      setEndDateError('');
    } else {
      setEndDateInput('');
      setEndDateError('');
    }
  }, [filterData.endDate]);

  const resetPagination = () => {
    if (tableData.changePage) {
      tableData.changePage(0);
    }
  };

  const handleRowClick = (row: any) => {
    if (row?.id && row?.idDevice) {
      handleClickRow(row.id, row.idDevice);
      const rowIndex = tableData.rows.findIndex((r) => r.id === row.id);
      setSelectedRowIndex(rowIndex);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (tableData.changePage) {
      tableData.changePage(newPage);
    }
    handleCloseAside();
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
          filterData.changeStartDate(date as any);
          resetPagination();
        }
      }
    } else if (maskedValue.length === 0) {
      filterData.changeStartDate(null);
      resetPagination();
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
          filterData.changeEndDate(date as any);
          resetPagination();
        }
      }
    } else if (maskedValue.length === 0) {
      filterData.changeEndDate(null);
      resetPagination();
      setEndDateError('');
    } else {
      setEndDateError('');
    }
  };

  const handleStartDateBlur = () => {
    if (startDateInput && startDateInput.length < 10) {
      setStartDateInput(formatDateForDisplay(filterData.startDate));
      setStartDateError('');
    } else if (startDateInput && startDateInput.length === 10 && startDateError) {
      setStartDateInput('');
      filterData.changeStartDate(null);
      setStartDateError('');
      resetPagination();
    }
  };

  const handleEndDateBlur = () => {
    if (endDateInput && endDateInput.length < 10) {
      setEndDateInput(formatDateForDisplay(filterData.endDate));
      setEndDateError('');
    } else if (endDateInput && endDateInput.length === 10 && endDateError) {
      setEndDateInput('');
      filterData.changeEndDate(null);
      setEndDateError('');
      resetPagination();
    }
  };

  const handleNativeDateChange = (type: 'start' | 'end', value: string) => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        if (type === 'start') {
          filterData.changeStartDate(date as any);
          setStartDateInput(formatDateForDisplay(date));
          setStartDateError('');
        } else {
          filterData.changeEndDate(date as any);
          setEndDateInput(formatDateForDisplay(date));
          setEndDateError('');
        }
        resetPagination();
      }
    } else {
      if (type === 'start') {
        filterData.changeStartDate(null);
        setStartDateInput('');
        setStartDateError('');
      } else {
        filterData.changeEndDate(null);
        setEndDateInput('');
        setEndDateError('');
      }
      resetPagination();
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
    filterData.changeStartDate(null);
    setStartDateError('');
    resetPagination();
  };

  const handleClearEndDate = () => {
    setEndDateInput('');
    filterData.changeEndDate(null);
    setEndDateError('');
    resetPagination();
  };

  // Получаем названия полей из columns для отображения в мобильной версии
  const getFieldLabel = (field: string): string => {
    const column = tableData.columns.find((col) => col.field === field);
    return column?.headerName || field;
  };

  // Функция для получения значения поля из строки
  const getFieldValue = (row: any, field: string): string => {
    return row[field] || '-';
  };

  // Функция для определения цвета статуса
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'Активен':
      case 'Успешно':
        return 'success';
      case 'COMPLETED':
      case 'Завершен':
        return 'primary';
      case 'EXPIRED':
      case 'Истек':
        return 'error';
      case 'CANCELLED':
      case 'Отменен':
      case 'Ожидание водителя':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Функция для рендеринга поля в зависимости от его типа
  const renderFieldValue = (field: string, value: any) => {
    if (field === 'STATE' || field === 'STATUS') {
      return (
        <Chip
          label={value}
          color={getStatusColor(value)}
          size="small"
          className={styles.eventChip}
        />
      );
    }
    return value;
  };

  // Поля которые нужно отображать в мобильной версии (исключаем actions)
  const mobileFields = tableData.columns
    .filter((col) => col.field !== 'actions')
    .map((col) => col.field);

  const handleResetAllFilters = () => {
    filterData.clearDates();
    filterData.setInput('');
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

    resetPagination();
  };

  // Авто-обновление данных каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [refetch]);

  return (
    <div className={styles.tableWrapper}>
      <h1 className={styles.mobileTitle}>{t('nav.serviceMode')}</h1>
      <div className={styles.mobileFilters}>
        <SearchInput
          testId={
            testids.page_avto_service.avto_service_widget_header
              .AVTO_SERVICE_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filterData.input}
          onClear={() => {
            filterData.setInput('');
            resetPagination();
          }}
          setState={(value) => {
            filterData.setInput(value);
            resetPagination();
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
                  value={formatDateForNative(filterData.startDate)}
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
                  value={formatDateForNative(filterData.endDate)}
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
          tableData.rows.map((row, index) => (
            <div
              key={row.id}
              className={`${styles.mobileRow} ${
                index === selectedRowIndex ? styles.selectedRow : ''
              }`}
              onClick={() => handleRowClick(row)}>
              {/* Отображаем все поля кроме actions */}
              {mobileFields.map((field) => {
                const value = getFieldValue(row, field);
                // Пропускаем пустые значения
                if (!value || value === '-' || value === '') return null;

                return (
                  <div key={field} className={styles.detailItem}>
                    <span className={styles.detailLabel}>{getFieldLabel(field)}:</span>
                    <span className={styles.detailValue}>{renderFieldValue(field, value)}</span>
                  </div>
                );
              })}
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
