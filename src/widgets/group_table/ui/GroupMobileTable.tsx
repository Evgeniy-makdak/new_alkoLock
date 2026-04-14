/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Add,
  CalendarToday,
  DeleteForever,
  Edit,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { IconButton, TextField, Tooltip } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { ID } from '@shared/types/BaseQueryTypes';
import { NativeDateHiddenInput } from '@shared/ui/native_date_hidden_input/NativeDateHiddenInput';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useGroupTable } from '../hooks/useGroupTable';
import styles from './GroupTable.module.scss';
import { GroupsMobileModals } from './GroupsMobileModals';

interface GroupMobileTableProps {
  onClickRow: (id: ID) => void;
  onCloseAside: () => void;
  selectedGroupId: ID | null;
  onBranchChange?: () => void;
  setState: (data: any) => void;
}

export const GroupMobileTable = ({
  onClickRow,
  onCloseAside,
  selectedGroupId,
  setState,
}: GroupMobileTableProps) => {
  const { t } = useTranslation();
  const { filtersData, tableData, addModalData, deleteModalData } = useGroupTable(
    onCloseAside,
    selectedGroupId,
  );

  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

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
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  };

  useEffect(() => {
    const resetFiltersListener = () => {
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

  useEffect(() => {
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
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

  const handleRowClick = (row: any) => {
    if (row?.id) {
      onClickRow(row.id);
      const rowIndex = tableData.rows.findIndex((r) => r.id === row.id);
      setSelectedRowIndex(rowIndex);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: newPage, pageSize: tableData.pageSize });
    }
    onCloseAside();
    setSelectedRowIndex(null);
  };

  const handleResetAllFilters = () => {
    filtersData.clearDates();
    filtersData.setInput('');
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

  const handleEditGroupClick = (id: ID) => {
    // Находим данные группы для редактирования
    const groupData = tableData.rows.find((row) => row.id === id);
    if (groupData) {
      // 🔧 FIX: Используем функцию getGroupName которая правильно извлекает имя
      const groupName = getGroupName(groupData);
      // Устанавливаем группу для редактирования и открываем модальное окно
      addModalData.setChangeBranch?.({ id, name: groupName });
      addModalData.toggleAddBranchModal();
    } else {
      console.error('❌ handleEditGroupClick - Group data not found for id:', id);
    }
  };

  const handleDeleteGroupClick = (id: ID) => {
    const groupData = tableData.rows.find((row) => row.id === id);
    const groupName = groupData ? getGroupName(groupData) : `Группа с ID: ${id}`;

    // Используем handleClickDeleteBranch из хука useGroupTable
    tableData.handleClickDeleteBranch?.(id, groupName);
  };

  const renderActionButtons = (row: any) => {
    return (
      <>
        <Tooltip title={t('common.edit')}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEditGroupClick(row.id);
            }}
            color="default"
            aria-label="Редактировать">
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('common.delete')}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteGroupClick(row.id);
            }}
            color="default"
            aria-label="Удалить">
            <DeleteForever fontSize="small" />
          </IconButton>
        </Tooltip>
      </>
    );
  };

  const getGroupName = (row: any) => {
    // Используем правильные поля из данных группы
    if (row.name && row.name.trim()) {
      return row.name.trim();
    }
    if (row.NAMING && row.NAMING.trim()) {
      return row.NAMING.trim();
    }
    if (row.naming && row.naming.trim()) {
      return row.naming.trim();
    }

    return 'Не указано';
  };

  const getGroupDetails = (row: any) => {
    const details = [];

    // Название группы
    if (row.name || row.NAMING || row.naming) {
      details.push({
        label: 'Название',
        value: getGroupName(row),
      });
    }

    // Описание
    if (row.description) {
      details.push({
        label: 'Описание',
        value: row.description,
      });
    }

    // Кем создана
    if (row.createdBy) {
      details.push({
        label: 'Кем создана',
        value: row.createdBy,
      });
    } else if (row.created_by) {
      details.push({
        label: 'Кем создана',
        value: row.created_by,
      });
    } else if (row.whoCreated) {
      details.push({
        label: 'Кем создана',
        value: row.whoCreated,
      });
    }

    // Дата создания
    if (row.createdAt) {
      details.push({
        label: 'Дата создания',
        value: row.createdAt,
      });
    } else if (row.created_at) {
      details.push({
        label: 'Дата создания',
        value: row.created_at,
      });
    } else if (row.creationDate) {
      details.push({
        label: 'Дата создания',
        value: row.creationDate,
      });
    }

    return details;
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <h2 className={styles.mobileTitle}>{t('nav.groups')}</h2>
        <IconButton
          className={styles.addButton}
          onClick={addModalData.toggleAddBranchModal}
          color="default"
          aria-label="Добавить группу">
          <Add />
        </IconButton>
      </div>

      <div className={styles.mobileFilters}>
        <SearchInput
          testId={testids.page_groups.groups_widget_header.GROUPS_WIDGET_HEADER_SEARCH_INPUT}
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
                      testids.page_attachments.attachments_widget_header
                        .ATTACHMENTS_WIDGET_HEADER_FROM_DATE,
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
                      testids.page_attachments.attachments_widget_header
                        .ATTACHMENTS_WIDGET_HEADER_TO_DATE,
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
      </div>

      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>{t('common.noData')}</div>
        ) : (
          tableData.rows.map((row, index) => {
            const details = getGroupDetails(row);

            return (
              <div
                key={row.id}
                className={`${styles.mobileRow} ${
                  index === selectedRowIndex ? styles.selectedRow : ''
                }`}
                onClick={() => handleRowClick(row)}>
                <div className={styles.rowMainInfo}>
                  <div className={styles.groupInfo}>
                    <div className={styles.groupName}>{getGroupName(row)}</div>
                  </div>

                  <div className={styles.rowActions}>{renderActionButtons(row)}</div>
                </div>

                <div className={styles.rowDetails}>
                  {details.map((detail, detailIndex) => (
                    <div key={detailIndex} className={styles.detailItem}>
                      <span className={styles.detailLabel}>{detail.label}:</span>
                      <span className={styles.detailValue}>{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
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

      <GroupsMobileModals
        addModalData={addModalData}
        deleteModalData={deleteModalData}
        setState={setState}
      />
    </div>
  );
};
