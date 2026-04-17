/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Add,
  CheckCircleOutlineRounded,
  DeleteForever,
  Edit,
  HighlightOff,
} from '@mui/icons-material';
import { IconButton, Tooltip } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { ID } from '@shared/types/BaseQueryTypes';
import { HiddenFiltersOfDates } from '@shared/ui/hidden_filters_of_dates';
import { MobileModals } from '@shared/ui/popup/MobileModals';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { useVehiclesTable } from '../hooks/useVehiclesTable';
import styles from './VehiclesTable.module.scss';

interface VehiclesMobileTableProps {
  onClickRow: (id: ID) => void;
  handleCloseAside: () => void;
  selectedCarId: ID | null;
  targetPageFromNavigation?: number | null;
  onTargetPageApplied?: () => void;
  onBranchChange?: () => void;
  prevBranch?: ID;
}

export const VehiclesMobileTable = ({
  onClickRow,
  handleCloseAside,
  selectedCarId,
  targetPageFromNavigation,
  onTargetPageApplied,
}: VehiclesMobileTableProps) => {
  const { t } = useTranslation();
  const {
    filtersData,
    tableData,
    addModalData,
    deleteCarModalData,
    recoverCarModalData,
    deleteTrueCarModalData,
  } = useVehiclesTable(handleCloseAside, selectedCarId, targetPageFromNavigation ?? null);

  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const { statusFilter, resetStatusFilter } = useStatusFilter();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const skipNextAutoResetRef = useRef(false);

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
    if (skipNextAutoResetRef.current) {
      skipNextAutoResetRef.current = false;
      return;
    }
    if (tableData.changeTableState) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  }, [statusFilter, tableData.changeTableState, tableData.pageSize]);

  useEffect(() => {
    if (skipNextAutoResetRef.current) {
      skipNextAutoResetRef.current = false;
      return;
    }
    if (tableData.sortModel && tableData.changeTableState) {
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  }, [tableData.sortModel, tableData.changeTableState, tableData.pageSize]);

  useEffect(() => {
    if (selectedCarId == null) {
      setSelectedRowIndex(null);
      return;
    }

    const rowIndex = tableData.rows.findIndex((row) => String(row?.id) === String(selectedCarId));
    setSelectedRowIndex(rowIndex >= 0 ? rowIndex : null);
  }, [selectedCarId, tableData.rows]);

  useEffect(() => {
    if (targetPageFromNavigation == null) return;
    const nextPage = Number(targetPageFromNavigation);
    if (!Number.isFinite(nextPage) || nextPage < 0) {
      onTargetPageApplied?.();
      return;
    }
    if (tableData.page !== nextPage && tableData.changeTableState) {
      tableData.changeTableState({ page: nextPage, pageSize: tableData.pageSize });
    }
    skipNextAutoResetRef.current = true;
    onTargetPageApplied?.();
  }, [
    targetPageFromNavigation,
    tableData.page,
    tableData.pageSize,
    tableData.changeTableState,
    onTargetPageApplied,
  ]);

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
    handleCloseAside();
    setSelectedRowIndex(null);
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? t('tooltips.recordActive') : t('tooltips.recordInactive');
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

  const handleAddCarClick = () => {
    addModalData.toggleAddCarModal();
  };

  const handleEditCarClick = (id: ID) => {
    if (addModalData.handleClickAddCar) {
      addModalData.handleClickAddCar(id);
    }
  };

  const handleDeactivateCarClick = (id: ID) => {
    const carData = tableData.rows.find((row) => row.id === id);
    const carName = carData ? getCarName(carData) : `ТС с ID: ${id}`;

    if (deleteCarModalData.handleClickDeletetCar) {
      deleteCarModalData.handleClickDeletetCar(id, carName);
    }
  };

  const handleTrueDeleteCarClick = (id: ID) => {
    const carData = tableData.rows.find((row) => row.id === id);
    const carName = carData ? getCarName(carData) : `ТС с ID: ${id}`;

    if (deleteTrueCarModalData.handleTrueClickDeletetCar) {
      deleteTrueCarModalData.handleTrueClickDeletetCar(id, carName);
    }
  };

  const handleRecoverCarClick = (id: ID) => {
    const carData = tableData.rows.find((row) => row.id === id);
    const carName = carData ? getCarName(carData) : `ТС с ID: ${id}`;

    if (recoverCarModalData.handleClickRecoverCar) {
      recoverCarModalData.handleClickRecoverCar(id, carName);
    }
  };

  const renderActionButtons = (row: any) => {
    if (row.isActive === true) {
      return (
        <>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditCarClick(row.id);
              }}
              color="default"
              aria-label="Редактировать">
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.deactivate')}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleDeactivateCarClick(row.id);
              }}
              color="default"
              aria-label="Деактивировать">
              <HighlightOff fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      );
    }

    if (row.isActive === false) {
      return (
        <>
          <Tooltip title={t('common.activate')}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleRecoverCarClick(row.id);
              }}
              color="default"
              aria-label="Активировать">
              <CheckCircleOutlineRounded fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.deletePermanently')}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleTrueDeleteCarClick(row.id);
              }}
              color="default"
              aria-label="Удалить навсегда">
              <DeleteForever fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      );
    }

    return null;
  };

  const getCarName = (row: any) => {
    if (row.NAME && row.NAME.trim()) {
      return row.NAME.trim();
    }

    const model = row.MODEL || row.model || '';
    const registrationNumber = row.REGISTRATION_NUMBER || row.registrationNumber || '';

    if (model && registrationNumber) {
      return `${model} (${registrationNumber})`;
    } else if (model) {
      return model;
    } else if (registrationNumber) {
      return registrationNumber;
    }

    return 'Не указано';
  };

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <h2 className={styles.mobileTitle}>{t('nav.transport')}</h2>
        <IconButton
          className={styles.addButton}
          onClick={handleAddCarClick}
          color="default"
          aria-label="Добавить транспорт">
          <Add />
        </IconButton>
      </div>

      <div className={styles.mobileFilters}>
        <SearchInput
          testId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_SEARCH_INPUT
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
          showStatusFilter={true}
        />

        <HiddenFiltersOfDates
          isOpen={showDateFilters}
          onToggle={() => setShowDateFilters(!showDateFilters)}
          onReset={handleResetAllFilters}
          startPlaceholder={t('datePlaceholder')}
          endPlaceholder={t('datePlaceholder')}
          startValue={startDateInput}
          endValue={endDateInput}
          startError={startDateError}
          endError={endDateError}
          onStartChange={handleStartDateChange}
          onEndChange={handleEndDateChange}
          onStartBlur={handleStartDateBlur}
          onEndBlur={handleEndDateBlur}
          onOpenStartCalendar={() => handleOpenCalendar('start')}
          onOpenEndCalendar={() => handleOpenCalendar('end')}
          onClearStart={handleClearStartDate}
          onClearEnd={handleClearEndDate}
          startDateTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_FROM_DATE
          }
          endDateTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_TO_DATE
          }
          startDateInputRef={startDateNativeRef}
          endDateInputRef={endDateNativeRef}
          startDateIso={formatDateForNative(filtersData.startDate)}
          endDateIso={formatDateForNative(filtersData.endDate)}
          onStartNativeCommit={(v) => handleNativeDateChange('start', v)}
          onEndNativeCommit={(v) => handleNativeDateChange('end', v)}
        />
      </div>

      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>{t('common.noData')}</div>
        ) : (
          tableData.rows.map((row, index) => (
            <div
              key={row.id}
              className={`${styles.mobileRow} ${
                index === selectedRowIndex ? styles.selectedRow : ''
              }`}
              onClick={() => handleRowClick(row)}>
              <div className={styles.rowMainInfo}>
                <div className={styles.carInfo}>
                  <div className={styles.carName}>{getCarName(row)}</div>
                  <Tooltip title={getStatusText(row.isActive)}>
                    <div
                      className={`${styles.statusCircle} ${
                        row.isActive ? styles.statusActive : styles.statusInactive
                      }`}
                    />
                  </Tooltip>
                </div>

                <div className={styles.rowActions}>{renderActionButtons(row)}</div>
              </div>

              <div className={styles.rowDetails}>
                {row.MARK && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Марка:</span>
                    <span className={styles.detailValue}>{row.MARK}</span>
                  </div>
                )}
                {row.VIN && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>VIN:</span>
                    <span className={styles.detailValue}>{row.VIN}</span>
                  </div>
                )}
                {row.COLOR && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Цвет:</span>
                    <span className={styles.detailValue}>{row.COLOR}</span>
                  </div>
                )}
                {row.YEAR && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Год:</span>
                    <span className={styles.detailValue}>{row.YEAR}</span>
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

      <MobileModals
        addCarModalData={{
          changeCarId: addModalData.changeCarId,
          closeAddCarModal: addModalData.closeAddCarModal,
          openAddCarModal: addModalData.openAddCarModal,
        }}
        deleteCarModalData={{
          closeDeleteModal: deleteCarModalData.closeDeleteModal,
          deleteCar: deleteCarModalData.deleteCar,
          isOpen: !!deleteCarModalData.deleteCar,
        }}
        recoverCarModalData={{
          closeRecoverModal: recoverCarModalData.closeRecoverModal,
          recoverCar: recoverCarModalData.recoverCar,
          isOpen: recoverCarModalData.isOpen,
          closeAside: recoverCarModalData.closeAside,
        }}
        deleteTrueCarModalData={{
          closeTrueDeleteModal: deleteTrueCarModalData.closeTrueDeleteModal,
          trueDeleteCar: deleteTrueCarModalData.trueDeleteCar,
          isOpen: !!deleteTrueCarModalData.trueDeleteCar,
        }}
      />
    </div>
  );
};
