/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, useEffect, useRef, useState } from 'react';

import { AlkolockDeleteForm } from '@features/alkolock_delete_form';
import { AlkolockTrueDeleteForm } from '@features/alkolock_true_delete_form/ui/AlkolockTrueDeleteForm';
import { AlkozamkiForm } from '@features/alkozamki_add_change_form';
import { RecoverAlcolockForm } from '@features/recover_alkolock_form';
import { Table } from '@shared/components/Table/Table';
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
  prevBranch: ID;
}

export const AlkolocksDesktopTable: FC<AlkolocksDesktopTableProps> = ({
  handleClickRow,
  handleCloseAside,
  selectedAlcolockId,
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
  const [isInitialized, setIsInitialized] = useState(false);
  const isInputFocused = useRef(false);

  // Проверка на открытые модальные окна
  const isAnyModalOpen =
    addModalData.openAddAlcolockModal ||
    !!deleteAlcolockModalData.deleteAlcolock ||
    recoverAlcolockModalData.isOpen ||
    !!trueDeleteAlcolockModalData.trueDeleteAlcolock;

  // Инициализация таблицы
  useEffect(() => {
    if (tableData.apiRef?.current && !isInitialized) {
      setIsInitialized(true);
    }
  }, [tableData.apiRef, isInitialized]);

  // Эффект для обработки выбранного алкозамка
  useEffect(() => {
    if (!isInitialized || !selectedAlcolockId) return;

    const handleSelection = () => {
      if (!tableData.apiRef?.current) return;

      const rowIndex = tableData.rows.findIndex((row) => row.id === selectedAlcolockId);
      if (rowIndex !== -1) {
        tableData.apiRef.current.scrollToIndexes({ rowIndex });
        tableData.apiRef.current.setRowSelectionModel([selectedAlcolockId]);
      } else {
        // Если не нашли на текущей странице, пробуем найти на других
        tableData.apiRef.current.setPage(0);
      }
    };

    const timer = setTimeout(handleSelection, 100);
    return () => clearTimeout(timer);
  }, [selectedAlcolockId, tableData.rows, isInitialized, tableData.apiRef]);

  // Блокировка фокуса и скролла таблицы при открытых модальных окнах
  useEffect(() => {
    if (!isInitialized || !tableWrapperRef.current) return;

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
  }, [isAnyModalOpen, isInitialized]);

  // Обработчики фильтров и сортировки - СБРОС СТРАНИЦЫ ОСТАВЛЕН
  useEffect(() => {
    if (isInitialized && statusFilter && tableData.apiRef?.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [statusFilter, isInitialized, tableData.apiRef]);

  useEffect(() => {
    if (isInitialized && tableData.apiRef?.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [prevBranch, isInitialized, tableData.apiRef]);

  useEffect(() => {
    if (isInitialized && tableData.sortModel && tableData.apiRef?.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel, isInitialized, tableData.apiRef]);

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
            tableData.apiRef.current.scrollToIndexes({ rowIndex: newIndex });
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
    if (!isInitialized || !tableWrapperRef.current || !isAnyModalOpen) return;

    const gridElement = tableWrapperRef.current.querySelector('.MuiDataGrid-root');
    if (gridElement) {
      (gridElement as HTMLElement).style.pointerEvents = 'none';
      (gridElement as HTMLElement).style.userSelect = 'none';

      const activeElement = document.activeElement as HTMLElement;
      if (gridElement.contains(activeElement)) {
        activeElement.blur();
      }
    }
  }, [isAnyModalOpen, isInitialized]);

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
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filtersData.clearDates();
            filtersData.setInput('');
            resetStatusFilter();
            tableData.apiRef?.current?.setPage(0);
          }}
        />
      </TableHeaderWrapper>

      <div className={styles.scrollableTable}>
        {isInitialized ? (
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
            getRowClassName={(params) =>
              params.id === tableData.rows[selectedRowIndex]?.id ? 'selected-row' : ''
            }
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
            disableRowSelectionOnClick={false}
            hideFooterSelectedRowCount={true}
          />
        ) : (
          <div>Инициализация таблицы...</div>
        )}
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
