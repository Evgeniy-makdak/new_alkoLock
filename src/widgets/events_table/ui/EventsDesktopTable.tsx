/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';

import { EventsFilterPanel } from '@features/events_filter_panel';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderEndToolbar } from '@shared/components/table_header_wrapper/ui/TableHeaderEndToolbar';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useEventsTable } from '../hooks/useEventsTable';
import styles from './EventsTable.module.scss';

interface EventsDesktopTableProps {
  handleClickRow: (id: string | number) => void;
  handleCloseInfo: () => void;
  prevBranch?: ID;
  openDetailsPanel?: (params: { id: string | number; content: React.ReactNode }) => void;
}

export const EventsDesktopTable = ({
  handleClickRow,
  handleCloseInfo,
  prevBranch,
}: EventsDesktopTableProps) => {
  const { filtersData, tableData } = useEventsTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const handleFilterChange = () => {
    if (tableData.apiRef.current) {
      setIsFiltersChanged(true);
      tableData.apiRef.current.setPage(0);
    }
  };

  // Добавляем слушатель для сброса фильтров
  useEffect(() => {
    const resetFiltersListener = () => {
      filtersData.resetFilters();
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

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

  // Обработчик событий клавиатуры для навигации по строкам
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!tableData.rows.length) return;

      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.closest('.MuiPickersPopper-root');

      if (
        isInputElement &&
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)
      ) {
        return;
      }

      if (event.key === 'Escape') {
        handleCloseInfo();
        return;
      }

      setSelectedRowIndex((prev) => {
        let newIndex = prev ?? -1;

        if (event.key === 'ArrowDown') {
          let nextIndex = newIndex + 1;
          while (nextIndex < tableData.rows.length && tableData.rows[nextIndex]?.isProcessing) {
            nextIndex++;
          }
          newIndex = Math.min(nextIndex, tableData.rows.length - 1);
        } else if (event.key === 'ArrowUp') {
          let prevIndex = newIndex - 1;
          while (prevIndex >= 0 && tableData.rows[prevIndex]?.isProcessing) {
            prevIndex--;
          }
          newIndex = Math.max(prevIndex, 0);
        }

        if (newIndex !== prev && newIndex >= 0 && newIndex < tableData.rows.length) {
          const newRow = tableData.rows[newIndex];
          if (newRow && !newRow.isProcessing) {
            handleClickRow(newRow.actionId);
            tableData.apiRef.current.selectRow(newRow.id, true);
            tableData.apiRef.current.setRowSelectionModel([newRow.id]);
            tableData.apiRef.current.scrollToIndexes({ rowIndex: newIndex });
          } else {
            return prev;
          }
        }

        return newIndex;
      });

      if (event.key === 'Enter' && selectedRowIndex !== null) {
        const currentRow = tableData.rows[selectedRowIndex];
        if (currentRow && !currentRow.isProcessing) {
          handleClickRow(currentRow.actionId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [tableData.rows, selectedRowIndex, handleCloseInfo]);

  const handleRowClick = (params: any) => {
    if (params?.row?.actionId) {
      handleClickRow(params.row.actionId);
      const rowIndex = tableData.rows.findIndex((row) => row.actionId === params.row.actionId);
      setSelectedRowIndex(rowIndex);

      if (tableData.apiRef.current && params.row.id) {
        tableData.apiRef.current.setRowSelectionModel([params.row.id]);
      }
    }
  };

  const handlePaginationModelChange = (paginationModel: any) => {
    tableData.changeTableState(paginationModel);
    handleCloseInfo();
    setSelectedRowIndex(null);
  };

  return (
    <div className={styles.tableWrapper}>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_SEARCH_INPUT}
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
          inputStartTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE}
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
        <TableHeaderEndToolbar>
          <ResetFilters
            reset={() => {
              filtersData.clearDates();
              filtersData.setInput('');
              const event = new CustomEvent('resetFilters');
              window.dispatchEvent(event);
            }}
          />
        </TableHeaderEndToolbar>
      </TableHeaderWrapper>

      <EventsFilterPanel open={filtersData.openFilters} onFilterChange={handleFilterChange} />

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
          columns={tableData.columns}
          rows={tableData.rows}
          pointer
          onRowClick={handleRowClick}
          onCellClick={handleRowClick}
          getRowClassName={(params) => {
            const idStr = String(params.id);
            const classes: string[] = [];
            if (idStr === tableData.rows[selectedRowIndex]?.id) {
              classes.push('selected-row');
            }
            if (tableData.highlightedEventIds?.has(idStr)) {
              classes.push(styles.rowNewlyArrived);
            }
            return classes.filter(Boolean).join(' ');
          }}
          sx={{
            '& .MuiDataGrid-virtualScroller': {
              overflowX: 'auto',
            },
            '& .MuiDataGrid-cell': {
              outline: 'none !important',
              border: 'none !important',
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none !important',
              border: 'none !important',
            },
            '& .MuiDataGrid-cell:focus-within': {
              outline: 'none !important',
              border: 'none !important',
            },
            '& .MuiDataGrid-cell--withRenderer': {
              outline: 'none !important',
              border: 'none !important',
            },
            '& .MuiDataGrid-cell--withBorder': {
              border: 'none !important',
            },
            '& .MuiDataGrid-cell:focus::after': {
              content: 'none !important',
              border: 'none !important',
            },
            '& .MuiDataGrid-row.Mui-selected': {
              backgroundColor: '#f5f5f5 !important',
            },
            '& .MuiDataGrid-row.Mui-selected:hover': {
              backgroundColor: '#f5f5f5 !important',
            },
          }}
          disableRowSelectionOnClick={false}
          hideFooterSelectedRowCount={true}
        />
      </div>
    </div>
  );
};
