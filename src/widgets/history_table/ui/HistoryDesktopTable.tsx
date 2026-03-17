/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';

import { HistoryFilterPanel } from '@features/history_filter_panel';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useHistoryTable } from '../hooks/useHistoryTable';

interface HistoryDesktopTableProps {
  prevBranch: ID;
}

export const HistoryDesktopTable = ({ prevBranch }: HistoryDesktopTableProps) => {
  const { filtersData, tableData } = useHistoryTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | number | null>(null);
  const isInputFocused = useRef(false);

  const handleFilterChange = () => {
    setIsFiltersChanged(true);
    tableData.apiRef.current.setPage(0);
  };

  useEffect(() => {
    tableData.apiRef.current.setPage(0);
  }, [prevBranch]);

  useEffect(() => {
    if (tableData.sortModel) {
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!tableData.rows.length) return;
      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        Boolean(activeElement.closest('.MuiPickersPopper-root'));

      isInputFocused.current = isInputElement;

      if (isInputElement) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
          return;
        }
      }

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();

        let currentIndex = selectedRowId
          ? tableData.rows.findIndex((row) => row.id === selectedRowId)
          : -1;

        if (currentIndex === -1) {
          currentIndex = -1;
        }

        let newIndex = currentIndex;
        if (event.key === 'ArrowDown') {
          newIndex =
            currentIndex === -1 ? 0 : Math.min(currentIndex + 1, tableData.rows.length - 1);
        } else if (event.key === 'ArrowUp') {
          newIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        }

        const newRow = tableData.rows[newIndex];
        if (newRow) {
          setSelectedRowId(newRow.id);
          tableData.apiRef.current.setRowSelectionModel([newRow.id]);
          tableData.apiRef.current.scrollToIndexes({ rowIndex: newIndex });

          const rowElement = document.querySelector(`[data-id="${newRow.id}"]`);
          if (rowElement) {
            (rowElement as HTMLElement).focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tableData.rows, selectedRowId]);

  const handleRowClick = (params: any) => {
    if (params?.row?.id) {
      setSelectedRowId(params.row.id);
      tableData.apiRef.current.setRowSelectionModel([params.row.id]);
    }
  };

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            handleFilterChange();
          }}
          setState={(value) => {
            filtersData.setInput(value);
            handleFilterChange();
          }}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            handleFilterChange();
          }}
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
        <FilterButton
          active={filtersData.hasActiveFilters}
          open={filtersData.openFilters}
          toggle={filtersData.toggleFilters}
          testid={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_FILTER_BUTTON
          }
        />
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            const event = new CustomEvent('resetFilters');
            window.dispatchEvent(event);
            filtersData.resetFilters();
            filtersData.clearDates();
            filtersData.setInput('');
            handleFilterChange();
          }}
        />
      </TableHeaderWrapper>
      <HistoryFilterPanel open={filtersData.openFilters} onFilterChange={handleFilterChange} />
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={(paginationModel) => {
          tableData.changeTableState(paginationModel);
        }}
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.columns}
        rows={tableData.rows}
        pointer
        onRowClick={handleRowClick}
        onCellClick={handleRowClick}
        getRowClassName={(params) => (params.id === selectedRowId ? 'selected-row' : '')}
        rowSelectionModel={selectedRowId ? [selectedRowId] : []}
        sx={{
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
          '& .MuiDataGrid-row:not(:hover) .MuiTooltip-tooltip': {
            display: 'none !important',
          },
          '& .MuiDataGrid-row:hover .MuiTooltip-tooltip': {
            display: 'block !important',
          },
          '& .MuiDataGrid-cell:not(:hover) .MuiIconButton-root + .MuiTooltip-tooltip': {
            display: 'none !important',
          },
        }}
        disableRowSelectionOnClick={false}
        hideFooterSelectedRowCount={true}
      />
    </>
  );
};
