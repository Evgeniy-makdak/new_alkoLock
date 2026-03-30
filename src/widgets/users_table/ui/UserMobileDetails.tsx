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
import { Chip, IconButton, Tooltip } from '@mui/material';

import { MobilePaginationWithJump } from '@shared/components/Pagination';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { useUsersTable } from '../hooks/useUsersTable';
import styles from './UsersTable.module.scss';

interface UsersMobileTableProps {
  onRowClick: (id: ID, isActive: boolean) => void;
  handleCloseAside: () => void;
  selectedUserId: ID | null;
  onAddUser: () => void;
  onEditUser: (id: ID) => void;
  onDeleteUser: (id: ID, isActive: boolean) => void; // Добавляем isActive для правильного отображения иконки
}

export const UsersMobileTable = ({
  onRowClick,
  handleCloseAside,
  selectedUserId,
  onAddUser,
  onEditUser,
  onDeleteUser,
}: UsersMobileTableProps) => {
  const { t } = useTranslation();
  const { filtersData, tableData } = useUsersTable(handleCloseAside, selectedUserId);
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const { statusFilter, resetStatusFilter } = useStatusFilter();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

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
  }, [statusFilter]);

  useEffect(() => {
    if (tableData.sortModel && tableData.changeTableState) {
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
      onRowClick(row.id, row.isActive);
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

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'error';
  };

  const getStatusText = (isActive: boolean) => {
    return isActive ? 'Активен' : 'Неактивен';
  };

  const handleResetAllFilters = () => {
    filtersData.clearDates();
    filtersData.setInput('');
    resetStatusFilter();
    handleFilterChange();
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);
  };

  // Функция для получения ФИО из данных строки - исправленная версия
  const getFullName = (row: any) => {
    // Используем правильные поля из данных пользователя
    const surname = row.surname || row.lastName || '';
    const firstName = row.name || row.firstName || '';
    const middleName = row.middleName || row.patronymic || '';

    const fullName = `${surname} ${firstName} ${middleName}`.trim();
    return fullName || row.username || row.email || 'Не указан';
  };

  // Функция для получения правильной иконки удаления в зависимости от статуса
  const getDeleteIcon = (row: any) => {
    if (row.isActive === false) {
      return <DeleteForever fontSize="small" />;
    }
    return <HighlightOff fontSize="small" />;
  };

  // Функция для получения подсказки для кнопки удаления
  const getDeleteTooltip = (row: any) => {
    if (row.isActive === false) {
      return t('common.deletePermanently');
    }
    return t('common.deactivate');
  };

  return (
    <div className={styles.tableWrapper}>
      {/* Заголовок с кнопкой добавления */}
      <div className={styles.mobileHeader}>
        <h2 className={styles.mobileTitle}>{t('nav.users')}</h2>
        <IconButton
          className={styles.addButton}
          onClick={onAddUser}
          color="primary"
          aria-label="Добавить пользователя">
          <Add />
        </IconButton>
      </div>

      {/* Вертикальное расположение фильтров для мобильной версии */}
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

        {/* Фильтры по датам для мобильной версии */}
        <div className={styles.mobileDateFilters}>
          <InputsDates
            onClear={() => {
              filtersData.clearDates();
              handleFilterChange();
            }}
            inputStartTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_FROM_DATE}
            inputEndTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_TO_DATE}
            onChangeStartDate={(date) => {
              filtersData.changeStartDate(date);
              handleFilterChange();
            }}
            onChangeEndDate={(date) => {
              filtersData.changeEndDate(date);
              handleFilterChange();
            }}
            valueStartDatePicker={filtersData.startDate}
            valueEndDatePicker={filtersData.endDate}
          />
        </div>

        <div className={styles.filterActions}>
          <ResetFilters reset={handleResetAllFilters} />
        </div>
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
              <div className={styles.rowMain}>
                <div className={styles.userName}>{getFullName(row)}</div>
                <div className={styles.status}>
                  <Chip
                    label={getStatusText(row.isActive)}
                    color={getStatusColor(row.isActive)}
                    size="small"
                  />
                </div>
              </div>
              <div className={styles.rowDetails}>
                {row.email && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue}>{row.email}</span>
                  </div>
                )}
                {row.phone && row.phone !== '-' && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Телефон:</span>
                    <span className={styles.detailValue}>{row.phone}</span>
                  </div>
                )}
                {row.roles && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Роли:</span>
                    <div className={styles.chipContainer}>
                      {Array.isArray(row.roles) ? (
                        row.roles
                          .slice(0, 2)
                          .map((role: string, idx: number) => (
                            <Chip key={idx} label={role} size="small" className={styles.roleChip} />
                          ))
                      ) : (
                        <Chip label={row.roles} size="small" className={styles.roleChip} />
                      )}
                      {Array.isArray(row.roles) && row.roles.length > 2 && (
                        <Chip label={`+${row.roles.length - 2}`} size="small" variant="outlined" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Кнопки действий */}
              <div className={styles.rowActions}>
                <Tooltip title={t('common.edit')}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditUser(row.id);
                    }}
                    color="primary"
                    aria-label="Редактировать">
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>

                {/* Кнопка восстановления для неактивных пользователей */}
                {row.isActive === false && (
                  <Tooltip title={t('common.activate')}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      color="success"
                      aria-label="Активировать">
                      <CheckCircleOutlineRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {/* Кнопка удаления/деактивации */}
                <Tooltip title={getDeleteTooltip(row)}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteUser(row.id, row.isActive);
                    }}
                    color={row.isActive === false ? 'error' : 'warning'}
                    aria-label={getDeleteTooltip(row)}>
                    {getDeleteIcon(row)}
                  </IconButton>
                </Tooltip>
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
