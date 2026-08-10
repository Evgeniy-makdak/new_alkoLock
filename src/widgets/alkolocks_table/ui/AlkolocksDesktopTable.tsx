/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, useEffect, useRef, useState } from 'react';

import { AlkolockDeleteForm } from '@features/alkolock_delete_form';
import { AlkolockTrueDeleteForm } from '@features/alkolock_true_delete_form/ui/AlkolockTrueDeleteForm';
import { AlkozamkiForm } from '@features/alkozamki_add_change_form';
import { RecoverAlcolockForm } from '@features/recover_alkolock_form';
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

import { useAlkolocksTable } from '../hooks/useAlkolocksTable';
import styles from './AlkolocksTable.module.scss';

// ИМПОРТ СТИЛЕЙ

interface AlkolocksDesktopTableProps {
  handleClickRow: (id: ID) => void;
  handleCloseAside: () => void;
  selectedAlcolockId: ID | null;
  targetPageFromNavigation?: number | null;
  onTargetPageApplied?: () => void;
  prevBranch: ID;
}

export const AlkolocksDesktopTable: FC<AlkolocksDesktopTableProps> = ({
  handleClickRow,
  handleCloseAside,
  selectedAlcolockId,
  targetPageFromNavigation,
  onTargetPageApplied,
  prevBranch,
}) => {
  const {
    filtersData,
    tableData,
    addModalData,
    deleteAlcolockModalData,
    recoverAlcolockModalData,
    trueDeleteAlcolockModalData,
  } = useAlkolocksTable(handleCloseAside, selectedAlcolockId);

  const { statusFilter, resetStatusFilter } = useStatusFilter();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const isInputFocused = useRef(false);
  const skipNextAutoResetRef = useRef(false);
  const suppressCloseOnNextPaginationRef = useRef(false);
  // Хранит предыдущее значение prevBranch для корректного определения смены филиала.
  // prevBranch при первом рендере = null (из Alkozamki.tsx), а реальный id бранча
  // появляется позже (после useEffect в Alkozamki.tsx). Без этого ref-а эффект
  // ниже ошибочно вызывает setPage(0) при переходе null→id во время первого клика
  // на пагинацию (handleCloseAside вызывает ре-рендер Alkozamki, который впервые
  // передаёт реальный prevBranch).
  const prevBranchTracker = useRef(prevBranch);

  // Проверка на открытые модальные окна
  const isAnyModalOpen =
    addModalData.openAddAlcolockModal ||
    !!deleteAlcolockModalData.deleteAlcolock ||
    recoverAlcolockModalData.isOpen ||
    !!trueDeleteAlcolockModalData.trueDeleteAlcolock;

  // Применяем целевую страницу только один раз при переходе по ссылке.
  useEffect(() => {
    if (targetPageFromNavigation == null) return;
    skipNextAutoResetRef.current = true;
    suppressCloseOnNextPaginationRef.current = true;
    tableData.changeTableState?.({ page: targetPageFromNavigation, pageSize: tableData.pageSize });
    tableData.apiRef?.current?.setPage(targetPageFromNavigation);
    onTargetPageApplied?.();
  }, [
    onTargetPageApplied,
    tableData.changeTableState,
    tableData.pageSize,
    targetPageFromNavigation,
  ]);

  // Эффект для обработки выбранного алкозамка
  useEffect(() => {
    if (!selectedAlcolockId || !tableData.apiRef?.current) return;

    const handleSelection = () => {
      if (!tableData.apiRef?.current) return;

      const rowIndex = tableData.rows.findIndex((row) => row.id === selectedAlcolockId);
      if (rowIndex !== -1) {
        setSelectedRowIndex(rowIndex);
        safeScrollToIndexes(tableData.apiRef, { rowIndex });
        tableData.apiRef.current.setRowSelectionModel([selectedAlcolockId]);
      }
    };

    const timer = setTimeout(handleSelection, 100);
    return () => clearTimeout(timer);
  }, [selectedAlcolockId, tableData.rows]);

  // Блокировка фокуса и скролла таблицы при открытых модальных окнах
  useEffect(() => {
    if (!tableWrapperRef.current) return;

    const tableElement = tableWrapperRef.current.querySelector('.MuiDataGrid-root');
    if (tableElement) {
      if (isAnyModalOpen) {
        tableElement.setAttribute('tabindex', '-1');
        (tableElement as HTMLElement).style.pointerEvents = 'none';
        (tableElement as HTMLElement).style.opacity = '0.7';
      } else {
        tableElement.setAttribute('tabindex', '0');
        (tableElement as HTMLElement).style.pointerEvents = 'auto';
        (tableElement as HTMLElement).style.opacity = '1';
      }
    }
  }, [isAnyModalOpen]);

  // Сброс страницы при смене фильтров/сортировки — идентично Events/Users
  useEffect(() => {
    if (statusFilter && tableData.apiRef?.current) {
      if (skipNextAutoResetRef.current) {
        skipNextAutoResetRef.current = false;
        return;
      }
      tableData.apiRef.current.setPage(0);
    }
  }, [statusFilter]);

  // Сбрасывает страницу только при реальной смене филиала (оба значения не null).
  // Игнорирует переход null → id, который возникает при первом клике пагинации:
  // handleCloseAside() вызывает ре-рендер Alkozamki.tsx, который впервые передаёт
  // реальный prevBranch (из prevBranch.current, обновлённого в useEffect Alkozamki).
  useEffect(() => {
    const prev = prevBranchTracker.current;
    prevBranchTracker.current = prevBranch;
    if (prev != null && prevBranch != null && prev !== prevBranch) {
      tableData.apiRef?.current?.setPage(0);
    }
  }, [prevBranch]);

  // Deps — примитивы (field + sort), а не ссылка на массив.
  // Именно так сделано в Events/Users: смена ссылки объекта не вызывает лишний сброс страницы.
  useEffect(() => {
    if (tableData.sortModel && tableData.apiRef?.current) {
      if (skipNextAutoResetRef.current) {
        skipNextAutoResetRef.current = false;
        return;
      }
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

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

      // Если фокус на input, в календаре или открыто модальное окно - игнорируем навигационные клавиши
      if (isInputElement || isAnyModalOpen) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
          return;
        }
      }
      const isNavigationKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
      ].includes(event.key);

      if (isAnyModalOpen && isNavigationKey) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      if (!tableData.rows.length) return;

      if (event.key === 'Escape') {
        handleCloseAside();
        return;
      }

      if (isAnyModalOpen) return;

      setSelectedRowIndex((prev) => {
        let newIndex = prev ?? -1;

        if (event.key === 'ArrowDown') {
          newIndex = Math.min(newIndex + 1, tableData.rows.length - 1);
        } else if (event.key === 'ArrowUp') {
          newIndex = Math.max(newIndex - 1, 0);
        }

        if (newIndex !== prev && tableData.apiRef?.current) {
          const newRow = tableData.rows[newIndex];
          if (newRow) {
            handleClickRow(newRow.id);
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
          handleClickRow(selectedRow.id);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [
    tableData.rows,
    selectedRowIndex,
    handleCloseAside,
    isAnyModalOpen,
    handleClickRow,
    tableData.apiRef,
  ]);

  // Блокировка фокуса при модальных окнах
  useEffect(() => {
    if (!tableWrapperRef.current || !isAnyModalOpen) return;

    const gridElement = tableWrapperRef.current.querySelector('.MuiDataGrid-root');
    if (gridElement) {
      (gridElement as HTMLElement).style.pointerEvents = 'none';
      (gridElement as HTMLElement).style.userSelect = 'none';

      const activeElement = document.activeElement as HTMLElement;
      if (gridElement.contains(activeElement)) {
        activeElement.blur();
      }
    }
  }, [isAnyModalOpen]);

  const handleRowClick = (params: any) => {
    // Обрабатываем клик по любой ячейке строки - БЕЗ СБРОСА СТРАНИЦЫ
    if (params?.row?.id && !isAnyModalOpen) {
      handleClickRow(params.row.id);
      const rowIndex = tableData.rows.findIndex((row) => row.id === params.row.id);
      setSelectedRowIndex(rowIndex);

      // Принудительно выделяем строку при клике на любую ячейку
      if (tableData.apiRef.current && params.row.id) {
        tableData.apiRef.current.setRowSelectionModel([params.row.id]);
      }
    }
  };

  const handlePaginationModelChange = (paginationModel: any) => {
    tableData.changeTableState(paginationModel);
    if (suppressCloseOnNextPaginationRef.current) {
      suppressCloseOnNextPaginationRef.current = false;
      return;
    }
    // Закрываем боковую панель при изменении пагинации
    handleCloseAside();
    setSelectedRowIndex(null);
    // Сбрасываем выделение строки
    if (tableData.apiRef?.current) {
      tableData.apiRef.current.setRowSelectionModel([]);
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef?.current?.setPage(0);
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef?.current?.setPage(0);
          }}
          showStatusFilter={true}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef?.current?.setPage(0);
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef?.current?.setPage(0);
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef?.current?.setPage(0);
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <TableHeaderEndToolbar>
          <ResetFilters
            reset={() => {
              filtersData.clearDates();
              filtersData.setInput('');
              resetStatusFilter();
              tableData.apiRef?.current?.setPage(0);
            }}
          />
        </TableHeaderEndToolbar>
      </TableHeaderWrapper>

      <div className={styles.scrollableTable}>
        <Table
          sortingMode="server"
          rowCount={tableData.totalCount}
          paginationMode="server"
          onSortModelChange={tableData.changeTableSorts}
          apiRef={tableData.apiRef}
          onPaginationModelChange={handlePaginationModelChange}
          pageNumber={tableData.page}
          loading={tableData.isLoading}
          columns={tableData.headers}
          rows={tableData.rows}
          pointer
          onRowClick={handleRowClick}
          onCellClick={handleRowClick}
          getRowClassName={(params) => {
            const modeClass =
              params.row.mode === 'Аварийный'
                ? 'row-mode-emergency'
                : params.row.mode === 'Сервисный'
                  ? 'row-mode-service'
                  : '';
            const selectedClass =
              selectedRowIndex != null &&
              params.id === tableData.rows[selectedRowIndex]?.id
                ? 'selected-row'
                : '';
            return [modeClass, selectedClass].filter(Boolean).join(' ');
          }}
          sx={{
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
            },
            '& .MuiDataGrid-cell': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus-within': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell--withRenderer': {
              outline: 'none !important',
            },
            '& .MuiDataGrid-cell:focus::after': {
              content: 'none !important',
            },
          }}
          disableRowSelectionOnClick={false}
          hideFooterSelectedRowCount={true}
        />
      </div>

      <Popup
        body={
          <AlkozamkiForm
            id={addModalData.changeAlkolockId}
            closeModal={addModalData.closeAddAlcolockModal}
          />
        }
        onCloseModal={addModalData.closeAddAlcolockModal}
        isOpen={addModalData.openAddAlcolockModal}
        toggleModal={addModalData.closeAddAlcolockModal}
      />
      <Popup
        isOpen={!!deleteAlcolockModalData.deleteAlcolock}
        toggleModal={deleteAlcolockModalData.closeDeleteModal}
        body={
          <AlkolockDeleteForm
            closeDeleteModal={deleteAlcolockModalData.closeDeleteModal}
            alkolock={deleteAlcolockModalData.deleteAlcolock}
          />
        }
      />
      <Popup
        body={
          <RecoverAlcolockForm
            alcolock={recoverAlcolockModalData.recoverAlkolock}
            closeModal={recoverAlcolockModalData.closeRecoverModal}
            closeAside={recoverAlcolockModalData.closeAside}
          />
        }
        onCloseModal={recoverAlcolockModalData.closeRecoverModal}
        isOpen={recoverAlcolockModalData.isOpen}
        toggleModal={recoverAlcolockModalData.closeRecoverModal}
      />
      <Popup
        isOpen={!!trueDeleteAlcolockModalData.trueDeleteAlcolock}
        toggleModal={trueDeleteAlcolockModalData.closeTrueDeleteModal}
        body={
          <AlkolockTrueDeleteForm
            closeTrueDeleteModal={trueDeleteAlcolockModalData.closeTrueDeleteModal}
            alkolock={trueDeleteAlcolockModalData.trueDeleteAlcolock}
          />
        }
      />
    </div>
  );
};
