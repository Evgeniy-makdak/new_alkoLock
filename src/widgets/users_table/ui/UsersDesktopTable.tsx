/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, ReactNode, useEffect, useRef, useState } from 'react';

import { DeleteUserForm } from '@features/delete_user_form';
import { RecoverUserForm } from '@features/recover_user_form/ui';
import { TrueDeleteUserForm } from '@features/true_delete_user_form';
import { UserAddChangeForm } from '@features/user_add_change_form';
import { Table } from '@shared/components/Table/Table';
import { safeScrollToIndexes } from '@shared/lib/safeScrollToIndexes';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { getLicenseExpirationRowClassName } from '@shared/utils/getLicenseExpirationStatus';

import { useUsersTable } from '../hooks/useUsersTable';
import styles from './UsersTable.module.scss';

type UsersDesktopTableProps = {
  onRowClick: (id: ID, isActive: boolean) => void;
  handleCloseAside: () => void;
  onBranchChange?: () => void;
  selectedUserId: ID | null;
  targetPageFromNavigation?: number | null;
  onTargetPageApplied?: () => void;
  onAddUser?: () => void; // Добавляем опциональные пропсы для совместимости
  onEditUser?: (id: ID) => void;
  onDeleteUser?: (id: ID) => void;
};

export const UsersDesktopTable: FC<UsersDesktopTableProps> = ({
  onRowClick,
  handleCloseAside,
  onBranchChange,
  selectedUserId,
  targetPageFromNavigation,
  onTargetPageApplied,
  onAddUser,
  onEditUser,
  onDeleteUser,
}) => {
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
  const isInputFocused = useRef(false);
  const skipNextAutoResetRef = useRef(false);

  useEffect(() => {
    if (targetPageFromNavigation == null || !tableData.changeTableState) return;
    skipNextAutoResetRef.current = true;
    tableData.changeTableState({ page: targetPageFromNavigation, pageSize: tableData.pageSize });
    tableData.apiRef.current?.setPage(targetPageFromNavigation);
  }, [tableData.changeTableState, tableData.pageSize, targetPageFromNavigation]);

  useEffect(() => {
    if (!selectedUserId) return;
    const rowIndex = tableData.rows.findIndex((row) => row.id === selectedUserId);
    if (rowIndex !== -1) {
      setSelectedRowIndex(rowIndex);
      tableData.apiRef.current?.setRowSelectionModel([selectedUserId]);
      if (targetPageFromNavigation != null) {
        onTargetPageApplied?.();
      }
    }
  }, [
    onTargetPageApplied,
    selectedUserId,
    tableData.apiRef,
    tableData.rows,
    targetPageFromNavigation,
  ]);

  // Для отслеживания закрытия модальных окон
  const [prevRecoverModalOpen, setPrevRecoverModalOpen] = useState(false);

  // Проверка на открытые модальные окна
  const isAnyModalOpen =
    addModalData.openAddUserModal ||
    deleteUserModalData.isOpen ||
    recoverUserModalData.isOpen ||
    trueDeleteUserModalData.isOpen;

  const handleFilterChange = () => {
    if (tableData.apiRef.current) {
      setIsFiltersChanged(true);
      tableData.apiRef.current.setPage(0);
    }
  };

  // Функция проверки, находится ли пользователь в текущих строках
  const isUserInCurrentRows = () => {
    if (!selectedUserId || tableData.rows.length === 0) return false;
    return tableData.rows.some((row) => row.id === selectedUserId);
  };

  // Проверяем видимость пользователя
  useEffect(() => {
    if (targetPageFromNavigation != null) return;
    if (selectedUserId && !isUserInCurrentRows()) {
      handleCloseAside();
      if (tableData.apiRef.current) {
        tableData.apiRef.current.setRowSelectionModel([]);
      }
      setSelectedRowIndex(null);
    }
  }, [tableData.rows, selectedUserId, handleCloseAside, targetPageFromNavigation]);

  // Отслеживаем закрытие модального окна восстановления
  useEffect(() => {
    // Если модальное окно восстановления только что закрылось
    if (prevRecoverModalOpen && !recoverUserModalData.isOpen && selectedUserId) {
      if (targetPageFromNavigation != null) return;
      // Даем время на обновление данных
      const timer = setTimeout(() => {
        if (selectedUserId && !isUserInCurrentRows()) {
          handleCloseAside();
          if (tableData.apiRef.current) {
            tableData.apiRef.current.setRowSelectionModel([]);
          }
          setSelectedRowIndex(null);
        }
      }, 500); // Увеличиваем задержку до 500мс

      return () => clearTimeout(timer);
    }

    // Обновляем предыдущее состояние
    setPrevRecoverModalOpen(recoverUserModalData.isOpen);
  }, [
    recoverUserModalData.isOpen,
    selectedUserId,
    handleCloseAside,
    tableData.rows,
    targetPageFromNavigation,
  ]);

  // Отслеживаем закрытие модального окна удаления
  useEffect(() => {
    if (deleteUserModalData.isOpen === false && selectedUserId) {
      if (targetPageFromNavigation != null) return;
      // Даем время на обновление данных
      const timer = setTimeout(() => {
        if (selectedUserId && !isUserInCurrentRows()) {
          handleCloseAside();
          if (tableData.apiRef.current) {
            tableData.apiRef.current.setRowSelectionModel([]);
          }
          setSelectedRowIndex(null);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    deleteUserModalData.isOpen,
    selectedUserId,
    handleCloseAside,
    tableData.rows,
    targetPageFromNavigation,
  ]);

  useEffect(() => {
    if (statusFilter && tableData.apiRef.current) {
      if (skipNextAutoResetRef.current) {
        skipNextAutoResetRef.current = false;
        return;
      }
      tableData.apiRef.current.setPage(0);
    }
  }, [statusFilter]);

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
    if (tableData.sortModel) {
      if (skipNextAutoResetRef.current) {
        skipNextAutoResetRef.current = false;
        return;
      }
      tableData.apiRef.current.setPage(0);
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

  // Обработчик клавиатуры
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        Boolean(activeElement.closest('.MuiPickersPopper-root'));

      // Обновляем состояние фокуса
      isInputFocused.current = isInputElement;

      // Если фокус на input или открыто модальное окно - игнорируем навигационные клавиши
      if (isInputElement || isAnyModalOpen) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
          return;
        }
      }

      // Обработка Escape для закрытия aside
      if (event.key === 'Escape') {
        handleCloseAside();
        return;
      }

      // Остальная логика обработки клавиш
      if (!tableData.rows.length || isInputElement) return;

      setSelectedRowIndex((prev) => {
        let newIndex = prev ?? -1;

        if (event.key === 'ArrowDown') {
          newIndex = Math.min(newIndex + 1, tableData.rows.length - 1);
        } else if (event.key === 'ArrowUp') {
          newIndex = Math.max(newIndex - 1, 0);
        }

        if (newIndex !== prev) {
          const newRow = tableData.rows[newIndex];
          if (newRow) {
            onRowClick(newRow.id, newRow.isActive);
            tableData.apiRef.current.selectRow(newRow.id, true);
            tableData.apiRef.current.setRowSelectionModel([newRow.id]);
            safeScrollToIndexes(tableData.apiRef, { rowIndex: newIndex });
          }
        }

        return newIndex;
      });

      if (event.key === 'Enter' && selectedRowIndex !== null) {
        const selectedRow = tableData.rows[selectedRowIndex];
        if (selectedRow) {
          onRowClick(selectedRow.id, selectedRow.isActive);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableData.rows, selectedRowIndex, handleCloseAside, isAnyModalOpen, onRowClick]);

  const handleRowClick = (params: any) => {
    // Обрабатываем клик по любой ячейке строки
    if (params?.row?.id) {
      onRowClick(params.row.id, params.row.isActive);
      const rowIndex = tableData.rows.findIndex((row) => row.id === params.row.id);
      setSelectedRowIndex(rowIndex);

      // Принудительно выделяем строку при клике на любую ячейку
      if (tableData.apiRef.current && params.row.id) {
        tableData.apiRef.current.setRowSelectionModel([params.row.id]);
      }
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <TableHeaderWrapper>
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', minWidth: 0 }}>
          <TableHeaderEndToolbar>
            <ResetFilters
              reset={() => {
                filtersData.clearDates();
                filtersData.setInput('');
                resetStatusFilter();
                handleFilterChange();
                const event = new CustomEvent('resetFilters');
                window.dispatchEvent(event);
              }}
            />
          </TableHeaderEndToolbar>
        </div>
      </TableHeaderWrapper>

      <div className={styles.scrollableTable}>
        <Table
          rowCount={tableData.totalCount ?? undefined}
          getRowHeight={() => 'auto'}
          sortingMode="server"
          paginationMode="server"
          onSortModelChange={tableData.changeTableSorts}
          apiRef={tableData.apiRef}
          onPaginationModelChange={tableData.changeTableState}
          pageNumber={tableData.page}
          loading={tableData.isLoading}
          columns={tableData.headers}
          rows={tableData.rows}
          pointer
          onRowClick={handleRowClick}
          onCellClick={handleRowClick} // Добавляем обработчик клика по ячейке
          getRowClassName={(params) => {
            const classes: string[] = [];
            if (
              selectedRowIndex != null &&
              params.id === tableData.rows[selectedRowIndex]?.id
            ) {
              classes.push('selected-row');
            }
            const licenseRowClass = getLicenseExpirationRowClassName(
              params.row.licenseExpirationStatus,
              styles,
            );
            if (licenseRowClass) {
              classes.push(licenseRowClass);
            }
            return classes.join(' ');
          }}
          sx={{
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
            },
            // Полностью отключаем фокус и выделение для всех ячеек
            '& .MuiDataGrid-cell': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus-within': {
              outline: 'none !important',
            },
            // Отключаем выделение ячеек
            '& .MuiDataGrid-cell--withRenderer': {
              outline: 'none !important',
            },
            // Отключаем box-shadow при фокусе
            '& .MuiDataGrid-cell:focus::after': {
              content: 'none !important',
            },
          }}
          // Дополнительно отключаем фокус через props DataGrid
          disableRowSelectionOnClick={false}
          hideFooterSelectedRowCount={true}
        />
      </div>

      <Popup
        body={
          <UserAddChangeForm
            id={addModalData.changeUserId ?? undefined}
            closeModal={addModalData.closeAddUserModal}
          />
        }
        closeonClickSpace={false}
        onCloseModal={addModalData.closeAddUserModal}
        isOpen={addModalData.openAddUserModal}
        toggleModal={addModalData.toggleAddUserModal}
      />
      <Popup
        body={
          <DeleteUserForm
            user={deleteUserModalData.deleteUser}
            closeModal={deleteUserModalData.closeDeleteModal}
            closeAside={deleteUserModalData.closeAside}
          />
        }
        onCloseModal={deleteUserModalData.closeDeleteModal}
        isOpen={deleteUserModalData.isOpen}
        toggleModal={deleteUserModalData.closeDeleteModal}
      />
      <Popup
        body={
          <RecoverUserForm
            user={recoverUserModalData.recoverUser}
            closeModal={recoverUserModalData.closeRecoverModal}
            closeAside={recoverUserModalData.closeAside}
          />
        }
        onCloseModal={recoverUserModalData.closeRecoverModal}
        isOpen={recoverUserModalData.isOpen}
        toggleModal={recoverUserModalData.closeRecoverModal}
      />
      <Popup
        body={
          <TrueDeleteUserForm
            user={trueDeleteUserModalData.trueDeleteUser}
            closeModal={trueDeleteUserModalData.closeTrueDeleteModal}
            closeAside={trueDeleteUserModalData.closeAside}
          />
        }
        onCloseModal={trueDeleteUserModalData.closeTrueDeleteModal}
        isOpen={trueDeleteUserModalData.isOpen}
        toggleModal={trueDeleteUserModalData.closeTrueDeleteModal}
      />
    </div>
  );
};
