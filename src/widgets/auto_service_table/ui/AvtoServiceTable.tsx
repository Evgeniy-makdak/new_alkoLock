/* eslint-disable @typescript-eslint/no-unused-vars */
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useAvtoServiceTable } from '../hooks/useAvtoServiceTable';
import { useEffect } from 'react';

interface AvtoServiceTableProps {
  handleClickRow: (id: string | number, idDevice: string | number) => void;
  onBranchChange: () => void;
}

export const AvtoServiceTable = ({ handleClickRow, onBranchChange }: AvtoServiceTableProps) => {
  const { filterData, tableData } = useAvtoServiceTable();

  // Функция для сброса пагинации
  const resetPagination = () => {
    if (tableData.apiRef.current) {
      tableData.apiRef.current.setPage(0);
    }
  };

  useEffect(() => {
    if(tableData.sortModel) {
      tableData.apiRef.current.setPage(0);
    }
  }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field])

  useEffect(() => {
    onBranchChange(); // Вызываем очистку фильтров при изменении филиала
  }, [onBranchChange]);

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_avto_service.avto_service_widget_header.AVTO_SERVICE_WIDGET_HEADER_SEARCH_INPUT}
          value={filterData.input}
          onClear={() => {
            filterData.setInput('');
            resetPagination();
          }}
          setState={(value) => {
            filterData.setInput(value);
            resetPagination();
          }}
        />
        <InputsDates
          onClear={() => {
            filterData.clearDates();
            resetPagination();
          }}
          inputStartTestId={testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE}
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
        getRowClassName={() => {
          return '';
        }}
        rows={tableData.rows}
        onRowClick={(params) => {
          handleClickRow(params?.id, params?.row?.idDevice);
        }}
      />
    </>
  );
};
