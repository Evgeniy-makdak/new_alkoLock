import { useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { IBranch, ID } from '@shared/types/BaseQueryTypes';

import { useGroupCarTableApi } from '../api/useGroupCarTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';

export const useGroupCarTable = (groupInfo: IBranch) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.CARS_TABLE_IN_GROUP,
  );

  const [changeCar, setChangeCar] = useState<{ text: string; id: ID }>(null);

  const [openAddCarModal, toggleAddCarModal, closeAddCarModal] = useToggle(false);

  const [input, setInput] = useState('');

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { cars, isLoading, refetch } = useGroupCarTableApi({
    searchQuery,
    page: state.page,
    limit: state.pageSize,
    filterOptions: {
      branchId: groupInfo?.id,
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const rows = useGetRows(cars);
  const headers = useGetColumns(refetch, toggleAddCarModal, setChangeCar);

  const closeEditModal = () => {
    setChangeCar(null);
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
    changeCar,
    closeEditModal,
    open: !!changeCar,
  };

  return {
    addModalData,
    tableData,
    filtersData,
    editModalData,
  };
};
