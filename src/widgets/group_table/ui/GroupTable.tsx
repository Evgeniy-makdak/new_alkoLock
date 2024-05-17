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
