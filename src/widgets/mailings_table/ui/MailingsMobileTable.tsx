/* eslint-disable react-hooks/exhaustive-deps */
import { type FC, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Add } from '@mui/icons-material';
import { Delete, Edit } from '@mui/icons-material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { IconButton } from '@mui/material';

import { DeleteMailingsForm } from '@features/delete_mailings_form';
import { MailingsAddChangeForm } from '@features/mailings_add_change_form';
import { RecoverMailingsForm } from '@features/recover_mailings_form/ui';
import { TrueDeleteMailingsForm } from '@features/true_delete_mailings_form';
import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { openNativeDatePickerFromHiddenInput } from '@shared/lib/openNativeDatePickerFromHiddenInput';
import { HiddenFiltersOfDates } from '@shared/ui/hidden_filters_of_dates';
import { Popup } from '@shared/ui/popup';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { useMailingsTable } from '../hooks/useMailingsTable';
import styles from './MailingssTable.module.scss';

type MailingsMobileTableProps = {
  onBranchChange: () => void;
};

export const MailingsMobileTable: FC<MailingsMobileTableProps> = ({
  onBranchChange, // eslint-disable-line @typescript-eslint/no-unused-vars
}) => {
  const { t } = useTranslation();
  const {
    filtersData,
    tableData,
    addModalData,
    deleteMailingModalData,
    recoverMailingModalData,
    trueDeleteMailingModalData,
  } = useMailingsTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const { statusFilter, resetStatusFilter } = useStatusFilter();
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
    if (tableData.changePage) {
      tableData.changePage(0);
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
    if (statusFilter && tableData.changePage) {
      tableData.changePage(0);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (tableData.sortModel && tableData.changePage) {
      tableData.changePage(0);
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
    if (row?.id) {
      const rowIndex = tableData.rows.findIndex((r: any) => r.id === row.id);
      setSelectedRowIndex(rowIndex);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (tableData.changePage) {
      tableData.changePage(newPage);
    }
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

  const handleResetAllFilters = () => {
    filtersData.clearDates();
    filtersData.setInput('');
    resetStatusFilter();
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

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.mobileHeader}>
        <h1 className={styles.mobileTitle}>{t('nav.mailings')}</h1>
        <IconButton className={styles.addButton} onClick={addModalData.toggleAddMailingModal}>
          <Add />
        </IconButton>
      </div>

      <div className={styles.mobileFilters}>
        <SearchInput
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            handleFilterChange();
          }}
          setState={(value: string) => {
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
          startDateInputRef={startDateNativeRef}
          endDateInputRef={endDateNativeRef}
          startDateIso={formatDateForNative(filtersData.startDate)}
          endDateIso={formatDateForNative(filtersData.endDate)}
          onStartNativeCommit={(v) => handleNativeDateChange('start', v)}
          onEndNativeCommit={(v) => handleNativeDateChange('end', v)}
          startDateTestId={undefined}
          endDateTestId={undefined}
        />
      </div>
      <div className={styles.mobileList}>
        {tableData.rows.length === 0 ? (
          <div className={styles.noData}>{t('common.noData')}</div>
        ) : (
          tableData.rows
            .filter((row: any) => row._isFirstRow)
            .map((row: any, index: number) => {
              const email = row.EMAIL || row._email || 'Без email';
              const status = row.isActive ? 'ACTIVE' : 'INACTIVE';
              const allEventsForEmail = tableData.rows.filter((r: any) => r._email === row._email);

              return (
                <div
                  key={row.id}
                  className={`${styles.mobileRow} ${
                    index === selectedRowIndex ? styles.selectedRow : ''
                  }`}
                  onClick={() => handleRowClick(row)}>
                  <div className={styles.rowMain}>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{email}</div>
                      <div className={styles.userDetails}>
                        {row.createdAt && (
                          <div className={styles.email}>
                            Создана: {new Date(row.createdAt).toLocaleDateString()}
                          </div>
                        )}
                        {row.updatedAt && (
                          <div className={styles.phone}>
                            Обновлена: {new Date(row.updatedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.statusIcons}>
                      <div
                        className={`${styles.statusCircle} ${
                          status === 'ACTIVE' ? styles.statusActive : styles.statusInactive
                        }`}
                      />
                    </div>
                  </div>
                  <div className={styles.rowDetails}>
                    {allEventsForEmail.map((eventRow: any, eventIndex: number) => (
                      <div key={eventRow.id} className={styles.eventItem}>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>{t('tables.eventType')}:</span>
                          <span className={styles.detailValue}>{eventRow.TYPE_OF_EVENT}</span>
                        </div>
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>{t('tables.interval')}:</span>
                          <span className={styles.detailValue}>{eventRow.TIME_INTERVAL}</span>
                        </div>
                        {eventIndex < allEventsForEmail.length - 1 && (
                          <hr className={styles.eventSeparator} />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className={styles.rowActions}>
                    {row.isActive ? (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            addModalData.handleClickAddUser(email, email);
                          }}
                          title={t('common.edit')}>
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMailingModalData.handleClickDeletetMailing(
                              email,
                              `рассылку для email: ${email}`,
                            );
                          }}
                          title={t('common.deactivate')}>
                          <HighlightOffIcon />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            recoverMailingModalData.handleClickRecoverMailing(
                              email,
                              `рассылку для email: ${email}`,
                            );
                          }}
                          title={t('common.activate')}>
                          <CheckCircleOutlineRoundedIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            trueDeleteMailingModalData.handleClickTrueDeleteMailing(
                              email,
                              `рассылку для email: ${email}`,
                            );
                          }}
                          title={t('common.deletePermanently')}>
                          <Delete />
                        </IconButton>
                      </>
                    )}
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
        />
      </div>

      <Popup
        body={
          <MailingsAddChangeForm
            id={addModalData.changeMailingId}
            closeModal={addModalData.closeAddMailingModal}
          />
        }
        closeonClickSpace={false}
        onCloseModal={addModalData.closeAddMailingModal}
        isOpen={addModalData.openAddMailingModal}
        toggleModal={addModalData.toggleAddMailingModal}
      />
      <Popup
        body={
          <DeleteMailingsForm
            mailing={deleteMailingModalData.deleteMailing}
            closeModal={deleteMailingModalData.closeDeleteModal}
            closeAside={() => {}}
          />
        }
        onCloseModal={deleteMailingModalData.closeDeleteModal}
        isOpen={deleteMailingModalData.isOpen}
        toggleModal={deleteMailingModalData.closeDeleteModal}
      />
      <Popup
        body={
          <RecoverMailingsForm
            mailing={recoverMailingModalData.recoverMailing}
            closeModal={recoverMailingModalData.closeRecoverModal}
            closeAside={() => {}}
          />
        }
        onCloseModal={recoverMailingModalData.closeRecoverModal}
        isOpen={recoverMailingModalData.isOpen}
        toggleModal={recoverMailingModalData.closeRecoverModal}
      />
      <Popup
        body={
          <TrueDeleteMailingsForm
            mailing={trueDeleteMailingModalData.trueDeleteMailing}
            closeModal={trueDeleteMailingModalData.closeTrueDeleteModal}
            closeAside={() => {}}
          />
        }
        onCloseModal={trueDeleteMailingModalData.closeTrueDeleteModal}
        isOpen={trueDeleteMailingModalData.isOpen}
        toggleModal={trueDeleteMailingModalData.closeTrueDeleteModal}
      />
    </div>
  );
};
