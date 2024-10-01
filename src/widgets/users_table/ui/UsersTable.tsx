/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, type FC } from 'react';

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
  handleCloseAside: () => void;
};

export const UsersTable: FC<UsersTableProps> = ({ onRowClick, handleCloseAside }) => {
  const { filtersData, tableData, addModalData, deleteUserModalData } =
    useUsersTable(handleCloseAside);

    useEffect(() => {
      if(tableData.sortModel) {
        tableData.apiRef.current.setPage(0);
      }
    }, [tableData.sortModel[0]?.sort, tableData.sortModel[0]?.field])

  return (
    <>
      <TableHeaderWrapper>
        <SearchInput
          testId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_SEARCH_INPUT}
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
            tableData.apiRef.current.setPage(0); // Сброс пагинации при очистке дат
          }}
          inputStartTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_TO_DATE}
          onChangeStartDate={(date) => {
            filtersData.changeStartDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении даты начала
          }}
          onChangeEndDate={(date) => {
            filtersData.changeEndDate(date);
            tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении даты окончания
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
        getRowHeight={() => 'auto'}
        sortingMode="server"
        paginationMode="server"
        onSortModelChange={tableData.changeTableSorts} 
        apiRef={tableData.apiRef}
        onPaginationModelChange={tableData.changeTableState} // Пагинация не сбрасывается при изменении страницы
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
            closeAside={deleteUserModalData.closeAside} // Передача closeAside
          />
        }
        onCloseModal={deleteUserModalData.closeDeleteModal}
        isOpen={deleteUserModalData.isOpen}
        toggleModal={deleteUserModalData.closeDeleteModal}
      />
    </>
  );
};
