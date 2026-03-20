/* eslint-disable react-hooks/exhaustive-deps */
import { type FC, useEffect, useRef, useState } from 'react';

import { GroupAddForm } from '@features/group_add_form';
import { GroupDeleteForm } from '@features/group_delete_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { SelectedBranchState } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useGroupTable } from '../hooks/useGroupTable';

type GroupDesktopTableProps = {
  handleClickRow: (id: ID) => void;
  onCloseAside: () => void;
  onBranchChange: () => void;
  selectedGroupId: ID | null;
  setState: (data: { selectedBranchState?: SelectedBranchState }) => void;
};

export const GroupDesktopTable: FC<GroupDesktopTableProps> = ({
  onCloseAside,
  handleClickRow,
  onBranchChange,
  selectedGroupId,
  setState,
}: GroupDesktopTableProps) => {
  const { filtersData, tableData, addModalData, deleteModalData } = useGroupTable(
    onCloseAside,
    selectedGroupId,
  );

  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const isInputFocused = useRef(false);

  // Проверка на открытые модальные окна
  const isAnyModalOpen = addModalData.openAddBranchModal || deleteModalData.isOpen;

  useEffect(() => {
    onBranchChange(); // Вызываем очистку фильтров при изменении филиала
  }, [onBranchChange]);

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
        onCloseAside();
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

    // Добавляем обработчик с высоким приоритетом (фаза захвата)
    document.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [tableData.rows, selectedRowIndex, onCloseAside, isAnyModalOpen, handleClickRow]);

  const handleRowClick = (params: any) => {
    // Обрабатываем клик по любой ячейке строки, включая крайние ячейки
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

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_groups.groups_widget_header.GROUPS_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0);
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0);
          }}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef.current.setPage(0);
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
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
        <ResetFilters
          reset={() => {
            filtersData.clearDates();
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0);
          }}
        />
      </TableHeaderWrapper>
      <Table
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
        sortingMode="server"
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
          '& .MuiDataGrid-row:not(:hover) .MuiTooltip-popper': {
            opacity: '0 !important',
            visibility: 'hidden !important',
            pointerEvents: 'none !important',
          },
          '& .MuiDataGrid-row:hover .MuiTooltip-popper': {
            opacity: '1 !important',
            visibility: 'visible !important',
            pointerEvents: 'auto !important',
          },
        }}
        // Дополнительно отключаем фокус через props DataGrid
        disableRowSelectionOnClick={false}
        hideFooterSelectedRowCount={true}
      />
      <Popup
        body={
          <GroupAddForm
            branch={addModalData.changeBranch}
            close={addModalData.closeAddBranchModal}
          />
        }
        onCloseModal={addModalData.closeAddBranchModal}
        isOpen={addModalData.openAddBranchModal}
        toggleModal={addModalData.closeAddBranchModal}
      />
      <Popup
        isOpen={deleteModalData.isOpen}
        toggleModal={deleteModalData.handleCloseDeleteModal}
        body={
          <GroupDeleteForm
            closeModal={deleteModalData.handleCloseDeleteModal}
            branch={deleteModalData.selectBranchDelete}
            setState={setState}
          />
        }
      />
    </>
  );
};
