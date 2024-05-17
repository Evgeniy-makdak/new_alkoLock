/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC } from 'react';

import { DeleteUserForm } from '@features/delete_user_form';
import { UserAddChangeForm } from '@features/user_add_change_form';
import { Table } from '@shared/components/Table/Table';
import { TableHeaderWrapper } from '@shared/components/table_header_wrapper/ui/TableHeaderWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { InputsDates } from '@shared/ui/inputs_dates/InputsDates';
import { Popup } from '@shared/ui/popup';
import { ResetFilters } from '@shared/ui/reset_filters/ResetFilters';
import { SearchInput } from '@shared/ui/search_input/SearchInput';

import { useUsersTable } from '../hooks/useUsersTable';

type UsersTableProps = {
  onRowClick: (id: ID) => void;
};

export const UsersTable: FC<UsersTableProps> = ({ onRowClick }) => {
  const { filtersData, tableData, addModalData, deleteUserModalData } = useUsersTable();

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_SEARCH_INPUT}
          value={filtersData.input}
          onClear={() => filtersData.setInput('')}
          setState={filtersData.setInput}
        />
        <InputsDates
          onClear={filtersData.clearDates}
          inputStartTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_TO_DATE}
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
        getRowHeight={() => 'auto'}
        sortingMode="server"
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts}
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState}
        pageNumber={tableData.page}
        loading={tableData.isLoading}
        columns={tableData.headers}
        rows={tableData.rows}
        onRowClick={(params) => onRowClick(params?.id)}
      />
      <Popup
        body={
          <UserAddChangeForm
            id={addModalData.changeUserId}
            closeModal={addModalData.closeAddUserModal}
          />
        }
        closeonClickSpace={false}
        onCloseModal={addModalData.closeAddUserModal}
        isOpen={addModalData.openAddUserModal}
        toggleModal={addModalData.toggleAddUserModal}
      />
      <Popup
        body={
          <DeleteUserForm
            user={deleteUserModalData.deleteUser}
            closeModal={deleteUserModalData.closeDeleteModal}
          />
        }
        onCloseModal={deleteUserModalData.closeDeleteModal}
        isOpen={deleteUserModalData.isOpen}
        toggleModal={deleteUserModalData.closeDeleteModal}
      />
    </>
  );
};
