import { type ReactNode, useState } from 'react';

import { InputSearchDelay, Permissions } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useUsersTableApi } from '../api/useUsersTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useUsersTableStore } from '../model/usersTableStore';

export const useUsersTable = (handleCloseAside: () => void) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.USERS_TABLE,
  );

  const permissions = appStore((state) => state.permissions);
  const selectedBranchState = appStore((state) => state.selectedBranchState);
  const isGlobalAdmin = !permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  const isDisabledActionsColum = isGlobalAdmin || selectedBranchState?.id != 10;

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

  // const { handleCloseAside } = useUsers();

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

  const rows = useGetRows(users?.content);
  const totalCount = users?.totalElements || 0;
  const headers = useGetColumns(
    refetch,
    handleClickDeletetUser,
    toggleAddUserModal,
    handleClickAddUser,
    isDisabledActionsColum,
  );

  const closeEditModal = () => {
    closeAddUserModal();
    setChangeUserId(null);
  };

  const tableData = {
    ...state,
    totalCount,
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
    closeAside: handleCloseAside,
  };

  return {
    deleteUserModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
