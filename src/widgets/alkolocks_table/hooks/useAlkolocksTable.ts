import { type ReactNode, useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useAlkolocksApi } from '../api/alkolocksApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useAlcolocksStore } from '../model/alkolocksStore';

export const useAlkolocksTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.ALCOLOCKS_TABLE,
  );

  const [deleteAlcolock, setDeleteAlcolock] = useState(null);
  const [changeAlkolockId, setChangeAlkolockId] = useState<ID>(null);

  const [openAddAlcolockModal, toggleAddAlcolockModal, closeAddAlcolockModal] = useToggle(false);

  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } = useAlcolocksStore();

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { data, isLoading, refetch } = useAlkolocksApi({
    searchQuery,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    page: state.page,
    limit: state.pageSize,
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const handleClickDeletetAlcolock = (id: ID, text?: ReactNode) => {
    setDeleteAlcolock({
      id,
      text,
    });
  };
  const closeDeleteModal = () => {
    setDeleteAlcolock(null);
  };

  const handleClickAddAlkolock = (id: ID) => {
    setChangeAlkolockId(id);
    toggleAddAlcolockModal();
  };

  const rows = useGetRows(data);
  const headers = useGetColumns(
    refetch,
    handleClickDeletetAlcolock,
    toggleAddAlcolockModal,
    handleClickAddAlkolock,
  );

  const closeEditModal = () => {
    closeAddAlcolockModal();
    setChangeAlkolockId(null);
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
    changeAlkolockId,
    closeAddAlcolockModal: closeEditModal,
    toggleAddAlcolockModal,
    openAddAlcolockModal,
  };

  const deleteAlcolockModalData = {
    closeDeleteModal,
    deleteAlcolock,
  };

  return {
    deleteAlcolockModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
