import { useEffect, useRef } from 'react';
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
}

export const EventsTable = ({ handleClickRow }: EventsTableProps) => {
  const { filtersData, tableData } = useEventsTable();
  const prevRowCountRef = useRef(tableData.totalCount);

  const handleFilterChange = () => {
    tableData.apiRef.current.setPage(0); 
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (prevRowCountRef.current !== tableData.totalCount) {
        tableData.apiRef.current.setPage(0);
        prevRowCountRef.current = tableData.totalCount;
      }
    }, 1000); 

    return () => clearTimeout(timer);
  }, [tableData.totalCount]);

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            handleFilterChange(); // Сброс пагинации
          }}
          setState={(value) => {
            filtersData.setInput(value);
            handleFilterChange(); // Сброс пагинации
          }}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            handleFilterChange(); // Сброс пагинации
          }}
          inputStartTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE}
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            handleFilterChange(); // Сброс пагинации
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            handleFilterChange(); // Сброс пагинации
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <FilterButton
          active={filtersData.hasActiveFilters}
          open={filtersData.openFilters}
          toggle={filtersData.toggleFilters}
          testid={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FILTER_BUTTON
          }
        />
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filtersData.resetFilters();
            filtersData.clearDates();
            filtersData.setInput('');
            handleFilterChange(); // Сброс пагинации
          }}
        />
      </TableHeaderWrapper>
      <EventsFilterPanel open={filtersData.openFilters} />
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts} // Изменение сортировки не сбрасывает пагинацию
        apiRef={tableData.apiRef}
        onPaginationModelChange={(paginationModel) => {
          // Обновляем состояние пагинации без сброса
          tableData.changeTableState(paginationModel);
        }}
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.columns}
        rows={tableData.rows}
        pointer
        onRowClick={(params) => handleClickRow(params?.id)}
      />
    </>
  );
};
