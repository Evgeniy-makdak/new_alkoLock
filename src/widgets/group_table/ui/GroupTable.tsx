import type { FC } from 'react';

import { GroupAddForm } from '@features/group_add_form';
import { GroupDeleteForm } from '@features/group_delete_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useGroupTable } from '../hooks/useGroupTable';

type GroupTableProps = {
  handleClickRow: (id: ID) => void;
};

export const GroupTable: FC<GroupTableProps> = ({ handleClickRow }) => {
  const { filtersData, tableData, addModalData, deleteModalData } = useGroupTable();

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_groups.groups_widget_header.GROUPS_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => {
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации при очистке поиска
          }}
          setState={(value) => {
            filtersData.setInput(value);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении поиска
          }}
        />
        <InputsDates
          onClear={() => {
            filtersData.clearDates();
            tableData.apiRef.current.setPage(0); // Сброс пагинации при сбросе дат
          }}
          inputStartTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_FROM_DATE
          }
          inputEndTestId={
            testids.page_attachments.attachments_widget_header.ATTACHMENTS_WIDGET_HEADER_TO_DATE
          }
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении начальной даты
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении конечной даты
          }}
          valueStartDatePicker={filtersData.startDate}
          valueEndDatePicker={filtersData.endDate}
        />
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            filtersData.clearDates();
            filtersData.setInput('');
            tableData.apiRef.current.setPage(0); // Сброс пагинации при сбросе всех фильтров
          }}
        />
      </TableHeaderWrapper>
      <Table
        rowCount={tableData.totalCount}
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts} // Сортировка без сброса пагинации
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState} // Навигация по страницам
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
        onRowClick={(params) => handleClickRow(params?.id)}
        sortingMode="server"
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
          />
        }
      />
    </>
  );
};
