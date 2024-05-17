import { type ReactNode, useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useRolesTableApi } from '../api/useRolesTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';

export const useRolesTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.ROLES_TABLE,
  );

  const [deleteRole, setDeleteRole] = useState(null);
  const [changeRoleId, setChangeRoleId] = useState<ID>(null);

  const [openAddRoleModal, toggleAddRoleModal, closeAddRoleModal] = useToggle(false);

  const [input, setInput] = useState('');

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { roles, isLoading, refetch } = useRolesTableApi({
    searchQuery,
    page: state.page,
    limit: state.pageSize,
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const handleClickDeletetRole = (id: ID, text?: ReactNode) => {
    setDeleteRole({
      id,
      text,
    });
  };
  const closeDeleteModal = () => {
    setDeleteRole(null);
  };

  const handleClickAddRole = (id: ID) => {
    setChangeRoleId(id);
    toggleAddRoleModal();
  };

  const rows = useGetRows(roles);
  const headers = useGetColumns(
    refetch,
    handleClickDeletetRole,
    toggleAddRoleModal,
    handleClickAddRole,
  );

  const closeEditModal = () => {
    closeAddRoleModal();
    setChangeRoleId(null);
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
    changeRoleId,
    closeAddRoleModal: closeEditModal,
    toggleAddRoleModal,
    openAddRoleModal,
  };

  const deleteRoleModalData = {
    closeDeleteModal,
    deleteRole,
    isOpen: !!deleteRole,
  };

  return {
    deleteRoleModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
