import { useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { Formatters } from '@shared/utils/formatters';

import { useGroupTableApi } from '../api/useGroupTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useGroupTableStore } from '../model/groupTableStore';

export const useGroupTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.BRANCH_TABLE_SORTS,
  );
  const [selectBranchDelete, setSelectBranch] = useState<null | { id: number; text: string }>(null);

  const [openAddBranchModal, toggleAddBranchModal, closeAddBranchModal] = useToggle(false);

  const [changeBranch, setChangeBranch] = useState<null | { id: number; name: string }>(null);

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

  const handleClickDeleteBranch = (id: number, text: string) => {
    setSelectBranch({ id, text });
  };
  const handleCloseDeleteModal = () => {
    setSelectBranch(null);
  };
  const handleCloseAddModal = () => {
    setChangeBranch(null);
    closeAddBranchModal();
  };

  const rows = useGetRows(branchs);
  const headers = useGetColumns(
    refetch,
    handleClickDeleteBranch,
    toggleAddBranchModal,
    setChangeBranch,
  );

  const tableData = {
    ...state,
    apiRef,
    isLoading,
    changeTableState,
    changeTableSorts,
    rows,
    headers,
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
  };

  const deleteModalData = {
    handleCloseDeleteModal,
    selectBranchDelete,
    isOpen: !!selectBranchDelete,
  };

  return { tableData, filtersData, addModalData, deleteModalData };
};
