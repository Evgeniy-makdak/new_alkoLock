/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useRef, useState } from 'react';

import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useAvtoServiceTable } from '../hooks/useAvtoServiceTable';
import styles from './AvtoServiceTable.module.scss';

interface AvtoServiceDesktopTableProps {
  handleClickRow: (id: string | number, idDevice: string | number) => void;
  onBranchChange: () => void;
  handleCloseAside: () => void;
}

export const AvtoServiceDesktopTable = ({
  handleClickRow,
  onBranchChange,
  handleCloseAside,
}: AvtoServiceDesktopTableProps) => {
  const { filterData, tableData, refetch } = useAvtoServiceTable();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const isInputFocused = useRef(false);

  // Проверка на открытые модальные окна (добавьте соответствующие данные из хука, если есть модальные окна)
  const isAnyModalOpen = false;

  // Функция для сброса пагинации
  const resetPagination = useCallback(() => {
    if (tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.apiRef]);

  const handleSetInput = useCallback(
    (value: string) => {
      filterData.setInput(value);
      if (tableData.apiRef.current) {
        tableData.apiRef.current.setPage(0);
      }
    },
    [filterData.setInput, tableData.apiRef],
  );

  useEffect(() => {
    if (tableData.sortModel && tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field]);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);

    return () => {
      clearInterval(interval); // Очищаем интервал при размонтировании
    };
  }, [refetch]);

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
      // Определяем, является ли клавиша навигационной (которую нужно блокировать)
      const isNavigationKey = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Enter',
        'Escape',
      ].includes(event.key);

      // Если модальное окно открыто и это навигационная клавиша
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
            handleClickRow(newRow.id, newRow.idDevice);
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
          handleClickRow(selectedRow.id, selectedRow.idDevice);
        }
      }
    };

    // Добавляем обработчик с высоким приоритетом (фаза захвата)
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [tableData.rows, selectedRowIndex, isAnyModalOpen, handleClickRow, handleCloseAside]);

  const handleRowClick = (params: any) => {
    // Обрабатываем клик по любой ячейке строки, включая крайние ячейки
    if (params?.row?.id && params?.row?.idDevice && !isAnyModalOpen) {
      handleClickRow(params.row.id, params.row.idDevice);
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
          testId={
            testids.page_avto_service.avto_service_widget_header
              .AVTO_SERVICE_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filterData.input}
          onClear={() => {
            filterData.setInput('');
            resetPagination();
          }}
          setState={handleSetInput}
        />
        <InputsDates
          onClear={() => {
            filterData.clearDates();
            resetPagination();
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={filterData.changeStartDate}
          onChangeEndDate={filterData.changeEndDate}
          valueStartDatePicker={filterData.startDate}
          valueEndDatePicker={filterData.endDate}
        />
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filterData.clearDates();
            filterData.setInput('');
            resetPagination();
          }}
        />
      </TableHeaderWrapper>
      <div className={styles.scrollableTable}>
        <Table
          sortingMode="server"
          rowCount={tableData.totalCount}
          paginationMode="server"
          onSortModelChange={tableData.changeTableSorts}
          apiRef={tableData.apiRef}
          onPaginationModelChange={tableData.changeTableState}
          pageNumber={tableData.page}
          loading={tableData.isLoading}
          columns={tableData.columns}
          rows={tableData.rows}
          pointer
          onRowClick={handleRowClick}
          onCellClick={handleRowClick} // Добавляем обработчик клика по ячейке
          getRowClassName={(params) =>
            params.id === tableData.rows[selectedRowIndex]?.id ? 'selected-row' : ''
          }
          sx={{
            '& .MuiDataGrid-root': {
              pointerEvents: isAnyModalOpen ? 'none' : 'auto',
              opacity: isAnyModalOpen ? 0.7 : 1,
              userSelect: isAnyModalOpen ? 'none' : 'auto',
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
            // Скрываем тултипы для всех строк кроме hover
            '& .MuiDataGrid-row:not(:hover) .MuiTooltip-tooltip': {
              display: 'none !important',
            },
            '& .MuiDataGrid-row:hover .MuiTooltip-tooltip': {
              display: 'block !important',
            },
            // Скрываем тултипы для кнопок в ячейках действий
            '& .MuiDataGrid-cell:not(:hover) .MuiIconButton-root + .MuiTooltip-tooltip': {
              display: 'none !important',
            },
          }}
          // Дополнительно отключаем фокус через props DataGrid
          disableRowSelectionOnClick={false}
          hideFooterSelectedRowCount={true}
        />
      </div>
    </div>
  );
};
