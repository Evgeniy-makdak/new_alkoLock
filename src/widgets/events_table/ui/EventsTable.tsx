import { useEffect, useRef, useState } from 'react';

import { EventsFilterPanel } from '@features/events_filter_panel';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useEventsTable } from '../hooks/useEventsTable';

interface EventsTableProps {
  handleClickRow: (id: string | number) => void;
  // onBranchChange: () => void;
}

export const EventsTable = ({ handleClickRow }: EventsTableProps) => {
  const { filtersData, tableData } = useEventsTable();
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);

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

  // useEffect(() => {
  //   onBranchChange(); // Вызываем очистку фильтров при изменении филиала
  // }, [onBranchChange]);

  useEffect(() => {
    tableData.apiRef.current.setPage(0);
  }, []);

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

  return (
    <>
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
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filtersData.clearDates();
            filtersData.setInput('');
            const event = new CustomEvent('resetFilters');
            window.dispatchEvent(event);
          }}
        />
      </TableHeaderWrapper>
      <EventsFilterPanel open={filtersData.openFilters} onFilterChange={handleFilterChange} />
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
        onRowClick={(params) => {
          handleClickRow(params?.row.actionId)
        }}
      />
    </>
  );
};
