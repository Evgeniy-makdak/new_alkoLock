import { type ReactNode, useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useUsersTableApi } from '../api/useUsersTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useUsersTableStore } from '../model/usersTableStore';

export const useUsersTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.USERS_TABLE,
  );

  const [deleteUser, setDeleteUser] = useState(null);
  const [changeUserId, setChangeUserId] = useState<ID>(null);

  const [openAddUserModal, toggleAddUserModal, closeAddUserModal] = useToggle(false);

  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } = useUsersTableStore();

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { users, isLoading, refetch } = useUsersTableApi({
    searchQuery,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    page: state.page,
    limit: state.pageSize,
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const handleClickDeletetUser = (id: ID, text?: ReactNode) => {
    setDeleteUser({
      id,
      text,
    });
  };
  const closeDeleteModal = () => {
    setDeleteUser(null);
  };

  const handleClickAddUser = (id: ID) => {
    setChangeUserId(id);
    toggleAddUserModal();
  };

  const rows = useGetRows(users);
  const headers = useGetColumns(
    refetch,
    handleClickDeletetUser,
    toggleAddUserModal,
    handleClickAddUser,
  );

  const closeEditModal = () => {
    closeAddUserModal();
    setChangeUserId(null);
  };

  const tableData = {
    ...state,
    apiRef,
    rows,
    headers,
    changeTableState,
    changeTableSorts,
    isLoading,
  };

  const filtersData = {
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    startDate,
    setInput,
    input,
  };

  const addModalData = {
    changeUserId,
    closeAddUserModal: closeEditModal,
    toggleAddUserModal,
    openAddUserModal,
  };

  const deleteUserModalData = {
    closeDeleteModal,
    deleteUser,
    isOpen: !!deleteUser,
  };

  return {
    deleteUserModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
