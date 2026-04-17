/* eslint-disable react-hooks/exhaustive-deps */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Add,
  CheckCircleOutlineRounded,
  DeleteForever,
  Edit,
  HighlightOff,
  Lock,
  LockOpen,
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

import { useUsersTable } from '../hooks/useUsersTable';
import styles from './UsersTable.module.scss';

interface UsersMobileTableProps {
  onRowClick: (id: ID, isActive: boolean) => void;
  handleCloseAside: () => void;
  selectedUserId: ID | null;
  targetPageFromNavigation?: number | null;
  onTargetPageApplied?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddUser: () => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEditUser: (id: ID) => void;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDeleteUser: (id: ID, isActive: boolean) => void;
}

const UsersMobileHeader = memo(
  ({ title, onAdd, addAriaLabel }: { title: string; onAdd: () => void; addAriaLabel: string }) => {
    return (
      <div className={styles.mobileHeader}>
        <h2 className={styles.mobileTitle}>{title}</h2>
        <IconButton
          className={styles.addButton}
          onClick={onAdd}
          color="default"
          aria-label={addAriaLabel}>
          <Add />
        </IconButton>
      </div>
    );
  },
);
UsersMobileHeader.displayName = 'UsersMobileHeader';

export const UsersMobileTable = ({
  onRowClick,
  handleCloseAside,
  selectedUserId,
  targetPageFromNavigation,
  onTargetPageApplied,
}: UsersMobileTableProps) => {
  const { t } = useTranslation();
  const {
    filtersData,
    tableData,
    addModalData,
    deleteUserModalData,
    recoverUserModalData,
    trueDeleteUserModalData,
  } = useUsersTable(handleCloseAside, selectedUserId, targetPageFromNavigation);

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
  const addUserActionRef = useRef<() => void>(() => undefined);
  addUserActionRef.current = () => {
    if (addModalData?.handleClickAddUser) {
      addModalData.handleClickAddUser(null);
    } else {
      console.error('handleClickAddUser is not available');
    }
  };

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
      if (skipNextAutoResetRef.current) {
        skipNextAutoResetRef.current = false;
        return;
      }
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  }, [statusFilter]);

  useEffect(() => {
    if (tableData.sortModel && tableData.changeTableState) {
      if (skipNextAutoResetRef.current) {
        skipNextAutoResetRef.current = false;
        return;
      }
      tableData.changeTableState({ page: 0, pageSize: tableData.pageSize });
    }
  }, [tableData.sortModel]);

  useEffect(() => {
    if (targetPageFromNavigation == null || !tableData.changeTableState) return;
    skipNextAutoResetRef.current = true;
    tableData.changeTableState({ page: targetPageFromNavigation, pageSize: tableData.pageSize });
  }, [tableData.changeTableState, tableData.pageSize, targetPageFromNavigation]);

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
      onRowClick(row.id, row.isActive);
      const rowIndex = tableData.rows.findIndex((r) => r.id === row.id);
      setSelectedRowIndex(rowIndex);
    }
  };

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedRowIndex(null);
      return;
    }
    const rowIndex = tableData.rows.findIndex((row) => row.id === selectedUserId);
    if (rowIndex !== -1) {
      setSelectedRowIndex(rowIndex);
      if (targetPageFromNavigation != null) {
        onTargetPageApplied?.();
      }
    }
  }, [onTargetPageApplied, selectedUserId, tableData.rows, targetPageFromNavigation]);

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

  const getFullName = (row: any) => {
    if (row.USER && row.USER.trim()) {
      return row.USER.trim();
    }

    const surname = row.surname || row.lastName || '';
    const firstName = row.name || row.firstName || '';
    const middleName = row.middleName || row.patronymic || '';

    const fullName = `${surname} ${firstName} ${middleName}`.trim();
    return fullName || row.username || row.email || 'Не указан';
  };

  const handleAddUserClick = useCallback(() => {
    addUserActionRef.current();
  }, []);

  const handleEditUserClick = (id: ID) => {
    if (addModalData?.handleClickAddUser) {
      addModalData.handleClickAddUser(id);
    } else {
      console.error('handleClickAddUser is not available');
    }
  };

  const handleDeactivateUserClick = (id: ID) => {
    if (deleteUserModalData?.handleClickDeletetUser) {
      const userData = tableData.rows.find((row) => row.id === id);
      const userFullName = userData ? getFullName(userData) : `пользователя с ID: ${id}`;

      const user = { id, text: userFullName };
      deleteUserModalData.handleClickDeletetUser(id, user.text);
    } else {
      console.error('handleClickDeletetUser is not available');
    }
  };

  const handleTrueDeleteUserClick = (id: ID) => {
    if (trueDeleteUserModalData?.handleClickTrueDeleteUser) {
      const userData = tableData.rows.find((row) => row.id === id);
      const userFullName = userData ? getFullName(userData) : `пользователя с ID: ${id}`;

      const user = { id, text: userFullName };
      trueDeleteUserModalData.handleClickTrueDeleteUser(id, user.text);
    } else {
      console.error('handleClickTrueDeleteUser is not available');
    }
  };

  const handleRecoverUserClick = (id: ID) => {
    if (recoverUserModalData?.handleClickRecoverUser) {
      const userData = tableData.rows.find((row) => row.id === id);
      const userFullName = userData ? getFullName(userData) : `пользователя с ID: ${id}`;

      const user = { id, text: userFullName };
      recoverUserModalData.handleClickRecoverUser(id, user.text);
    } else {
      console.error('handleClickRecoverUser is not available');
    }
  };

  const isSuperAdmin = (row: any) => {
    return row.id === 1 || row.ROLE?.includes('Супер администратор') || row.isSuperAdmin === true;
  };

  const getAccessIcon = (row: any) => {
    const access = row.ACCESS || row.access;
    if (access === 'Запрещен' || access === 'Disabled' || access === false) {
      return <Lock fontSize="small" sx={{ color: '#f44336' }} />;
    }
    return <LockOpen fontSize="small" sx={{ color: '#4caf50' }} />;
  };

  const getAccessTooltip = (row: any) => {
    const access = row.ACCESS || row.access;
    if (access === 'Запрещен' || access === 'Disabled' || access === false) {
      return t('tooltips.accessDenied');
    }
    return t('tooltips.accessAllowed');
  };

  const renderActionButtons = (row: any) => {
    const userIsSuperAdmin = isSuperAdmin(row);

    if (userIsSuperAdmin) {
      return (
        <Tooltip title={t('common.edit')}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleEditUserClick(row.id);
            }}
            color="default"
            aria-label="Редактировать">
            <Edit fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }

    if (row.isActive === true) {
      return (
        <>
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleEditUserClick(row.id);
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
                handleDeactivateUserClick(row.id);
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
                handleRecoverUserClick(row.id);
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
                handleTrueDeleteUserClick(row.id);
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

  return (
    <div className={styles.tableWrapper}>
      <UsersMobileHeader
        title={t('nav.users')}
        onAdd={handleAddUserClick}
        addAriaLabel="Добавить пользователя"
      />

      <div className={styles.mobileFilters}>
        <SearchInput
          testId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_SEARCH_INPUT}
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
          startDateTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE}
          endDateTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE}
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
              <div className={styles.rowMain}>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{getFullName(row)}</div>
                  <div className={styles.userDetails}>
                    {row.email && <div className={styles.email}>{row.email}</div>}
                    {row.phone && row.phone !== '-' && (
                      <div className={styles.phone}>{row.phone}</div>
                    )}
                  </div>
                </div>

                <div className={styles.statusIcons}>
                  <Tooltip title={getAccessTooltip(row)}>
                    <div className={styles.accessIcon}>{getAccessIcon(row)}</div>
                  </Tooltip>

                  <Tooltip title={getStatusText(row.isActive)}>
                    <div
                      className={`${styles.statusCircle} ${
                        row.isActive ? styles.statusActive : styles.statusInactive
                      }`}
                    />
                  </Tooltip>

                  <div className={styles.rowActions}>{renderActionButtons(row)}</div>
                </div>
              </div>

              <div className={styles.rowDetails}>
                {row.ROLE && row.ROLE.length > 0 && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Роли:</span>
                    <div className={styles.chipContainer}>
                      {Array.isArray(row.ROLE) ? (
                        <span className={styles.rolesText}>
                          {row.ROLE.slice(0, 3).map((role: string, idx: number) => (
                            <span key={idx} className={styles.roleItem}>
                              {role}
                              {idx < Math.min(row.ROLE.length, 3) - 1 && ', '}
                            </span>
                          ))}
                          {row.ROLE.length > 3 && (
                            <span className={styles.rolesMore}> и ещё {row.ROLE.length - 3}</span>
                          )}
                        </span>
                      ) : (
                        <span className={styles.rolesText}>{row.ROLE}</span>
                      )}
                    </div>
                  </div>
                )}

                {row.DATE_CREATE && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Дата регистрации:</span>
                    <span className={styles.detailValue}>{row.DATE_CREATE}</span>
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
        addModalData={addModalData}
        deleteUserModalData={deleteUserModalData}
        recoverUserModalData={recoverUserModalData}
        trueDeleteUserModalData={trueDeleteUserModalData}
      />
    </div>
  );
};
