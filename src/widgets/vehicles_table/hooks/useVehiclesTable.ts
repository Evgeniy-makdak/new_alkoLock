import { type ReactNode, useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useVehiclesTableApi } from '../api/useVehiclesTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useVehiclesTableStore } from '../model/vehiclesTableStore';

export const useVehiclesTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.VEHICLES_PAGE_TABLE_SORTS,
  );

  const [deleteCar, setDeleteCar] = useState(null);
  const [changeCarId, setChangeCarId] = useState<ID>(null);
  const [openAddCarModal, toggleAddCarModal, closeAddCarModal] = useToggle(false);

  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } =
    useVehiclesTableStore();

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { cars, isLoading, refetch } = useVehiclesTableApi({
    searchQuery,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    page: state.page,
    limit: state.pageSize,
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const handleClickDeletetCar = (id: ID, text?: ReactNode) => {
    setDeleteCar({
      id,
      text,
    });
  };
  const closeDeleteModal = () => {
    setDeleteCar(null);
  };

  const handleClickAddCar = (id: ID) => {
    setChangeCarId(id);
    toggleAddCarModal();
  };

  const rows = useGetRows(cars);
  const headers = useGetColumns(
    refetch,
    handleClickDeletetCar,
    toggleAddCarModal,
    handleClickAddCar,
  );

  const closeEditModal = () => {
    closeAddCarModal();
    setChangeCarId(null);
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
    changeCarId,
    closeAddCarModal: closeEditModal,
    toggleAddCarModal,
    openAddCarModal,
  };

  const deleteCarModalData = {
    closeDeleteModal,
    deleteCar,
  };

  return {
    deleteCarModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
