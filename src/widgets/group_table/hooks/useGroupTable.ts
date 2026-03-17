import { useEffect, useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useGroupTableApi } from '../api/useGroupTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useGroupTableStore } from '../model/groupTableStore';

export const useGroupTable = (onCloseAside: () => void, selectedGroupId: ID | null) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.BRANCH_TABLE_SORTS,
  );

  const [selectBranchDelete, setSelectBranch] = useState<null | { id: ID; text: string }>(null);

  const [openAddBranchModal, toggleAddBranchModal, closeAddBranchModal] = useToggle(false);

  const [changeBranch, setChangeBranch] = useState<null | { id: ID; name: string }>(null);

  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } = useGroupTableStore();
  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { branchs, isLoading, refetch } = useGroupTableApi({
    searchQuery,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    page: state.page,
    limit: state.pageSize,
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  useEffect(() => {
    if (
      selectedGroupId &&
      !branchs?.content?.some((branchs: { id: ID }) => branchs.id === selectedGroupId)
    ) {
      onCloseAside();
    }
  }, [branchs, selectedGroupId, onCloseAside]);

  const newRefetch = async () => {
    refetch();
  };

  const handleClickDeleteBranch = (id: ID, text: string) => {
    setSelectBranch({ id, text });
  };

  const handleCloseDeleteModal = () => {
    setSelectBranch(null);
  };

  const handleCloseAddModal = () => {
    setChangeBranch(null);
    closeAddBranchModal();
  };

  const handleSetChangeBranch = (branch: { id: ID; name: string } | null) => {
    setChangeBranch(branch);
  };

  const rows = useGetRows(branchs?.content);
  const totalCount = branchs?.totalElements;
  const headers = useGetColumns(
    refetch,
    handleClickDeleteBranch,
    toggleAddBranchModal,
    handleSetChangeBranch,
    newRefetch,
  );

  const tableData = {
    ...state,
    totalCount,
    apiRef,
    isLoading,
    changeTableState,
    changeTableSorts,
    rows,
    headers,
    handleClickDeleteBranch, // Добавляем метод для мобильной версии
  };

  const filtersData = {
    input,
    changeEndDate,
    changeStartDate,
    clearDates,
    setInput,
    endDate,
    startDate,
  };

  const addModalData = {
    openAddBranchModal,
    closeAddBranchModal: handleCloseAddModal,
    changeBranch,
    toggleAddBranchModal,
    setChangeBranch: handleSetChangeBranch, // Добавляем метод для мобильной версии
  };

  const deleteModalData = {
    handleCloseDeleteModal,
    selectBranchDelete,
    isOpen: !!selectBranchDelete,
  };

  return { tableData, filtersData, addModalData, deleteModalData };
};
