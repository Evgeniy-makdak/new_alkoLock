/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, type FC, useState } from 'react';

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
  onBranchChange: () => void;
};

export const UsersTable: FC<UsersTableProps> = ({
  onRowClick,
  handleCloseAside,
  onBranchChange,
}) => {
  const { filtersData, tableData, addModalData, deleteUserModalData } =
    useUsersTable(handleCloseAside);
  const prevRowCountRef = useRef(tableData.totalCount);
  const pageSize = useRef(tableData.pageSize);
  const [isFiltersChanged, setIsFiltersChanged] = useState(false);

  const handleFilterChange = () => {
    setIsFiltersChanged(true);
    tableData.apiRef.current.setPage(0); // Сброс пагинации при изменении фильтров
  };

  // Добавляем слушатель для сброса фильтров
  useEffect(() => {
    const resetFiltersListener = () => {
      filtersData.clearDates();
      filtersData.setInput('');
      handleFilterChange();
    };
    window.addEventListener('resetFilters', resetFiltersListener);

    return () => {
      window.removeEventListener('resetFilters', resetFiltersListener);
    };
  }, [filtersData]);

  useEffect(() => {
    onBranchChange(); // Сброс фильтров при изменении филиала
  }, [onBranchChange]);

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
          testId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_SEARCH_INPUT}
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
          inputStartTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_FROM_DATE}
          inputEndTestId={testids.page_users.users_widget_header.USERS_WIDGET_HEADER_TO_DATE}
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
        <ResetFilters
          title="Сбросить фильтры"
          reset={() => {
            const event = new CustomEvent('resetFilters');
            window.dispatchEvent(event);
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
            closeAside={deleteUserModalData.closeAside}
          />
        }
        onCloseModal={deleteUserModalData.closeDeleteModal}
        isOpen={deleteUserModalData.isOpen}
        toggleModal={deleteUserModalData.closeDeleteModal}
      />
    </>
  );
};
