/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Add,
  CalendarToday,
  DeleteForever,
  KeyboardArrowDown,
  KeyboardArrowUp,
} from '@mui/icons-material';
import { Button, IconButton, TextField, Tooltip } from '@mui/material';

import { AttachmentDeleteForm } from '@features/attachment_delete_form';
import { AttachmentAddForm } from '@features/attachments_add_form';
import {
  AttachmentsFilterPanel,
  attachmentsFilterPanelStore,
} from '@features/attachments_filter_panel';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useAttachmentsTable } from '../hooks/useAttachmentsTable';
import styles from './AttachmentsTable.module.scss';

interface AttachmentsMobileTableProps {
  onBranchChange: () => void;
  prevBranch?: ID;
}

export const AttachmentsMobileTable = ({
  onBranchChange,
  prevBranch,
}: AttachmentsMobileTableProps) => {
  const { t } = useTranslation();
  const { addModalData, deleteAttachModalData, filtersData, tableData } = useAttachmentsTable();
  const resetFilters = attachmentsFilterPanelStore((state) => state.resetFilters);
  const hasActiveFilters = attachmentsFilterPanelStore((state) => state.hasActiveFilters);

  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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
    onBranchChange();
  }, [onBranchChange]);

  const handleRowClick = (row: any) => {
    if (row?.id) {
      setSelectedRowId(row.id);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (tableData.changePage) {
      tableData.changePage(newPage);
    }
    setSelectedRowId(null);
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
    if (type === 'start' && startDateNativeRef.current) {
      const input = startDateNativeRef.current;

      input.value = '';

      input.style.display = 'block';
      input.style.position = 'fixed';
      input.style.top = '50%';
      input.style.left = '50%';
      input.style.transform = 'translate(-50%, -50%)';
      input.style.zIndex = '9999';
      input.style.opacity = '0.01';
      input.style.width = '100px';
      input.style.height = '40px';

      input.focus();
      input.click();

      setTimeout(() => {
        input.style.display = 'none';
        input.value = formatDateForNative(filtersData.startDate);
      }, 100);
    } else if (type === 'end' && endDateNativeRef.current) {
      const input = endDateNativeRef.current;

      input.value = '';

      input.style.display = 'block';
      input.style.position = 'fixed';
      input.style.top = '50%';
      input.style.left = '50%';
      input.style.transform = 'translate(-50%, -50%)';
      input.style.zIndex = '9999';
      input.style.opacity = '0.01';
      input.style.width = '100px';
      input.style.height = '40px';

      input.focus();
      input.click();

      setTimeout(() => {
        input.style.display = 'none';
        input.value = formatDateForNative(filtersData.endDate);
      }, 100);
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
    resetFilters();

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
    resetFilters();

    handleFilterChange();
  };

  const handleDeleteAttachment = (id: number, text: string) => {
    if (tableData.handleClickDeleteAttachment) {
      tableData.handleClickDeleteAttachment(id, text);
    }
  };

  const handleAddAttachmentClick = () => {
    addModalData.toggleAddAttachModal();
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>{t('nav.attachments')}</h1>
        <IconButton
          className={styles.addButton}
          onClick={handleAddAttachmentClick}
          color="default"
          aria-label="Добавить привязку">
          <Add />
        </IconButton>
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

        <div className={styles.filterActions}>
          <FilterButton
            active={hasActiveFilters}
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
              <div className={styles.mobileFilterContainer}>
                <AttachmentsFilterPanel open={true} />
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

      <AttachmentsFilterPanel open={filtersData.openFilters} />

      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>Нет данных для отображения</div>
        ) : (
          tableData.rows.map((row) => (
            <div
              key={row.id}
              className={`${styles.mobileRow} ${
                row.id === selectedRowId ? styles.selectedRow : ''
              }`}
              onClick={() => handleRowClick(row)}>
              <div className={styles.rowMain}>
                <div className={styles.dateTime}>{row.DATE_CREATE || 'Дата не указана'}</div>
                {tableData.isVisibleActionsColum && (
                  <Tooltip title="Удалить">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAttachment(row.id, row.ALCOLOKS || 'Алкозамок');
                      }}
                      color="default"
                      aria-label="Удалить привязку">
                      <DeleteForever fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </div>

              <div className={styles.rowDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Алкозамок:</span>
                  <span className={styles.detailValue}>{row.ALCOLOKS || '-'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Серийный номер:</span>
                  <span className={styles.detailValue}>{row.SERIAL_NUMBER || '-'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>{t('tables.vehicleShort')}:</span>
                  <span className={styles.detailValue}>{row.TC || '-'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Водитель:</span>
                  <span className={styles.detailValue}>{row.DRIVER || '-'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Кем привязан:</span>
                  <span className={styles.detailValue}>{row.WHO_LINK || '-'}</span>
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

      <Popup
        closeonClickSpace={false}
        toggleModal={addModalData.toggleAddAttachModal}
        headerTitle={t('modals.bindAlcolock')}
        onCloseModal={addModalData.closeAddAttachModal}
        isOpen={addModalData.openAddAttachModal}
        body={<AttachmentAddForm onClose={addModalData.closeAddAttachModal} specified={true} />}
      />

      <Popup
        closeonClickSpace={false}
        onCloseModal={deleteAttachModalData.closeDeleteModal}
        isOpen={deleteAttachModalData.openDeleteModal}
        toggleModal={deleteAttachModalData.closeDeleteModal}
        body={
          <AttachmentDeleteForm
            closeModal={deleteAttachModalData.closeDeleteModal}
            attach={deleteAttachModalData.selectDeleteAttachment}
          />
        }
      />
    </div>
  );
};
