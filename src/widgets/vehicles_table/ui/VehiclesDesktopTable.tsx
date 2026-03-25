/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-unused-vars */
import { type FC, useEffect, useRef, useState } from 'react';

import { CarAddChangeForm } from '@features/car_add_change_form';
import { DeleteCarForm } from '@features/delete_car_form';
import { DeleteTrueCarForm } from '@features/delete_true_car_form/ui/DeleteTrueCarForm';
import { RecoverCarForm } from '@features/recover_car_form/ui';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

import { useVehiclesTable } from '../hooks/useVehiclesTable';

type VehiclesDesktopTableProps = {
  onClickRow: (id: ID) => void;
  handleCloseAside: () => void;
  onBranchChange: () => void;
  selectedCarId: ID | null;
  prevBranch?: ID;
};

export const VehiclesDesktopTable: FC<VehiclesDesktopTableProps> = ({
  onClickRow,
  handleCloseAside,
  selectedCarId,
  prevBranch,
}) => {
  const {
    filtersData,
    tableData,
    addModalData,
    deleteCarModalData,
    recoverCarModalData,
    deleteTrueCarModalData,
  } = useVehiclesTable(handleCloseAside, selectedCarId);

  const { statusFilter, resetStatusFilter } = useStatusFilter();
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const isInputFocused = useRef(false);

  // Проверка на открытые модальные окна
  const isAnyModalOpen =
    addModalData.openAddCarModal ||
    !!deleteCarModalData.deleteCar ||
    recoverCarModalData.isOpen ||
    !!deleteTrueCarModalData.trueDeleteCar;

  // Блокировка фокуса и скролла таблицы при открытых модальных окнах
  useEffect(() => {
    if (tableWrapperRef.current) {
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
    }
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (statusFilter && tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  }, [statusFilter, prevBranch]);

  useEffect(() => {
    if (tableData.sortModel) {
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
        // Особенно важно для таблицы MUI
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      // Остальная логика обработки клавиш (только когда модальные окна закрыты)
      if (!tableData.rows.length) return;

      if (event.key === 'Escape') {
        handleCloseAside();
        return;
      }

      if (isAnyModalOpen) return; // Дополнительная страховка

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
            onClickRow(newRow.id);
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
          onClickRow(selectedRow.id);
        }
      }
    };

    // Добавляем обработчик с высоким приоритетом (фаза захвата)
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [tableData.rows, selectedRowIndex, handleCloseAside, isAnyModalOpen, onClickRow]);

  const handleRowClick = (params: any) => {
    // Обрабатываем клик по любой ячейке строки, включая крайние ячейки
    if (params?.row?.id && !isAnyModalOpen) {
      onClickRow(params.row.id);
      const rowIndex = tableData.rows.findIndex((row) => row.id === params.row.id);
      setSelectedRowIndex(rowIndex);

      // Принудительно выделяем строку при клике на любую ячейку
      if (tableData.apiRef.current && params.row.id) {
        tableData.apiRef.current.setRowSelectionModel([params.row.id]);
      }
    }
  };

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0);
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0);
          }}
          showStatusFilter={true}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef.current.setPage(0);
          }}
          inputStartTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_transports.transports_widget_header.TRANSPORT_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef.current.setPage(0);
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef.current.setPage(0);
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
              tableData.apiRef.current.setPage(0);
            }}
          />
        </TableHeaderEndToolbar>
      </TableHeaderWrapper>
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
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
        getRowClassName={(params) =>
          params.id === tableData.rows[selectedRowIndex]?.id ? 'selected-row' : ''
        }
        sx={{
          '& .MuiDataGrid-root': {
            pointerEvents: isAnyModalOpen ? 'none' : 'auto',
            opacity: isAnyModalOpen ? 0.7 : 1,
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

      <Popup
        body={
          <CarAddChangeForm
            id={addModalData.changeCarId}
            closeModal={addModalData.closeAddCarModal}
          />
        }
        onCloseModal={addModalData.closeAddCarModal}
        isOpen={addModalData.openAddCarModal}
        toggleModal={addModalData.toggleAddCarModal}
      />
      <Popup
        isOpen={!!deleteCarModalData.deleteCar}
        toggleModal={deleteCarModalData.closeDeleteModal}
        body={
          <DeleteCarForm
            closeModal={deleteCarModalData.closeDeleteModal}
            car={deleteCarModalData.deleteCar}
          />
        }
      />
      <Popup
        body={
          <RecoverCarForm
            car={recoverCarModalData.recoverCar}
            closeModal={recoverCarModalData.closeRecoverModal}
            closeAside={recoverCarModalData.closeAside}
          />
        }
        onCloseModal={recoverCarModalData.closeRecoverModal}
        isOpen={recoverCarModalData.isOpen}
        toggleModal={recoverCarModalData.closeRecoverModal}
      />
      <Popup
        isOpen={!!deleteTrueCarModalData.trueDeleteCar}
        toggleModal={deleteTrueCarModalData.closeTrueDeleteModal}
        body={
          <DeleteTrueCarForm
            closeModal={deleteTrueCarModalData.closeTrueDeleteModal}
            car={deleteTrueCarModalData.trueDeleteCar}
          />
        }
      />
    </>
  );
};
