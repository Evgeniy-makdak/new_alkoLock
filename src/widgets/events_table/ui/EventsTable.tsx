import { EventsFilterPanel } from '@features/events_filter_panel';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';
import { FilterButton } from '@shared/ui/table_filter_button';

import { useEventsTable } from '../hooks/useEventsTable';

interface EventsTable {
  handleClickRow: (id: string | number) => void;
}

export const EventsTable = ({ handleClickRow }: EventsTable) => {
  const { filtersData, tableData } = useEventsTable();

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => filtersData.setInput('')}
          setState={filtersData.setInput}
        />
        <InputsDates
          onClear={filtersData.clearDates}
          inputStartTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_events.events_widget_header.EVENTS_WIDGET_HEADER_TO_DATE}
          onChangeStartDate={filtersData.changeStartDate}
          onChangeEndDate={filtersData.changeEndDate}
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
          reset={() => (filtersData.resetFilters(), filtersData.clearDates())}
        />
      </TableHeaderWrapper>
      <EventsFilterPanel open={filtersData.openFilters} />
      <Table
        sortingMode="server"
        // TODO => кол-во элементов должно приходить с бэка
        rowCount={100}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState}
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
