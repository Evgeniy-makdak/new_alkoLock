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
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице
          }}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filtersData.clearDates();
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации к первой странице
          }}
        />
      </TableHeaderWrapper>
      <Table
        sortingMode="server"
        rowCount={tableData.totalCount}
        paginationMode="server"
        onSortModelChange={(sortModel) => {
          // Изменение сортировки не сбрасывает пагинацию
          tableData.changeTableSorts(sortModel);
        }}
        apiRef={tableData.apiRef}
        onPaginationModelChange={(paginationModel) => {
          // Обновляем пагинацию при изменении страницы или размера страницы
          tableData.changeTableState(paginationModel);
          // Не сбрасываем пагинацию здесь, т.к. это событие обрабатывает навигацию по страницам
        }}
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
