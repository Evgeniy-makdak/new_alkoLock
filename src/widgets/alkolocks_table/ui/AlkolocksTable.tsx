import { AlkolockDeleteForm } from '@features/alkolock_delete_form';
import { AlkozamkiForm } from '@features/alkozamki_add_change_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useAlkolocksTable } from '../hooks/useAlkolocksTable';

interface AlkolocksTableProps {
  handleClickRow: (id: ID) => void;
}

export const AlkolocksTable = ({ handleClickRow }: AlkolocksTableProps) => {
  const { filtersData, tableData, addModalData, deleteAlcolockModalData } = useAlkolocksTable();

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={
            testids.page_attachments.attachments_widget_header
              .ATTACHMENTS_WIDGET_HEADER_SEARCH_INPUT
          }
          value={filtersData.input}
          onClear={() => filtersData.setInput('')}
          setState={filtersData.setInput}
        />
        <InputsDates
          onClear={filtersData.clearDates}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={filtersData.changeStartDate}
          onChangeEndDate={filtersData.changeEndDate}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <ResetFilters title="Сбросить фильтры" reset={() => filtersData.clearDates()} />
      </TableHeaderWrapper>
      <Table
        // TODO => кол-во элементов должно приходить с бэка
        sortingMode="server"
        rowCount={100}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState}
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
        onRowClick={(params) => handleClickRow(params?.id)}
      />
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
    </>
  );
};
