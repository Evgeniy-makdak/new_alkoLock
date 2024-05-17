import { useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { IBranch, ID } from '@shared/types/BaseQueryTypes';

import { useGroupUsersTableApi } from '../api/useGroupUsersTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRow';

export const useGroupUsersTable = (groupInfo: IBranch) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.USERS_TABLE_IN_GROUP,
  );

  const [changeUser, setChangeUser] = useState<{ text: string; id: ID }>(null);

  const [openAddCarModal, toggleAddCarModal, closeAddCarModal] = useToggle(false);

  const [input, setInput] = useState('');

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { users, isLoading, refetch } = useGroupUsersTableApi({
    searchQuery,
    page: state.page,
    limit: state.pageSize,
    filterOptions: {
      branchId: groupInfo?.id,
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const rows = useGetRows(users);
  const headers = useGetColumns(refetch, toggleAddCarModal, setChangeUser);

  const closeEditModal = () => {
    setChangeUser(null);
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
    setInput,
    input,
  };

  const addModalData = {
    closeAddCarModal,
    toggleAddCarModal,
    openAddCarModal,
  };

  const editModalData = {
    changeUser,
    closeEditModal,
    open: !!changeUser,
  };

  return {
    addModalData,
    tableData,
    filtersData,
    editModalData,
  };
};
