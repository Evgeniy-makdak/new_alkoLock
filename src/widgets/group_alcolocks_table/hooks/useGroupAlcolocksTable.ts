import { useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { IBranch, ID } from '@shared/types/BaseQueryTypes';

import { useGroupAlcolocksTableApi } from '../api/useGroupAlcolocksTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';

export const useGroupAlcolocksTable = (groupInfo: IBranch) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.ALCOLOCK_TABLE_IN_GROUP,
  );

  const [changeAlcolock, setChangeAlcolock] = useState<{ text: string; id: ID }>(null);

  const [openAddAlcolockModal, toggleAddAlcolockModal, closeAddAlcolockModal] = useToggle(false);

  const [input, setInput] = useState('');

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { alcolocks, isLoading, refetch } = useGroupAlcolocksTableApi({
    searchQuery,
    page: state.page,
    limit: state.pageSize,
    filterOptions: {
      branchId: groupInfo?.id,
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const rows = useGetRows(alcolocks);
  const headers = useGetColumns(refetch, toggleAddAlcolockModal, setChangeAlcolock);

  const closeEditModal = () => {
    setChangeAlcolock(null);
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
    closeAddAlcolockModal,
    toggleAddAlcolockModal,
    openAddAlcolockModal,
  };

  const editModalData = {
    changeAlcolock,
    closeEditModal,
    open: !!changeAlcolock,
  };

  return {
    addModalData,
    tableData,
    filtersData,
    editModalData,
  };
};
