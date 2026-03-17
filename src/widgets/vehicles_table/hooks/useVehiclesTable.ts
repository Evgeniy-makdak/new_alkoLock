import { type ReactNode, useEffect, useState } from 'react';

import { InputSearchDelay, Permissions } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useVehiclesTableApi } from '../api/useVehiclesTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useVehiclesTableStore } from '../model/vehiclesTableStore';

export const useVehiclesTable = (handleCloseAside: () => void, selectedCarId: ID | null) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.VEHICLES_PAGE_TABLE_SORTS,
  );

  const permissions = appStore((state) => state.permissions);
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  const isVisibleActionsColum =
    !permissions.includes('PERMISSION_VEHICLE_READ') ||
    permissions.includes('PERMISSION_VEHICLE_CREATE');
  const [deleteCar, setDeleteCar] = useState<{ id: ID; text: ReactNode } | null>(null);
  const [recoverCar, setRecoverCar] = useState<{ id: ID; text: ReactNode } | null>(null);
  const [changeCarId, setChangeCarId] = useState<ID>(null);
  const [openAddCarModal, toggleAddCarModal, closeAddCarModal] = useToggle(false);
  const [trueDeleteCar, setTrueDeleteCar] = useState<{ id: ID; text: ReactNode } | null>(null);

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
    isGlobalAdmin,
  });

  useEffect(() => {
    if (selectedCarId && !cars?.content?.some((cars: { id: ID }) => cars.id === selectedCarId)) {
      handleCloseAside();
    }
  }, [cars, selectedCarId, handleCloseAside]);

  const newRefetch = async () => {
    refetch();
  };

  // Добавляем недостающие функции для мобильной версии
  const handleClickDeletetCar = (id: ID, text?: ReactNode) => {
    setDeleteCar({
      id,
      text,
    });
  };

  const closeDeleteModal = () => {
    setDeleteCar(null);
  };

  const handleTrueClickDeletetCar = (id: ID, text?: ReactNode) => {
    setTrueDeleteCar({
      id,
      text,
    });
  };

  const closeTrueDeleteModal = () => {
    setTrueDeleteCar(null);
  };

  const handleClickAddCar = (id: ID) => {
    setChangeCarId(id);
    toggleAddCarModal();
  };

  const handleClickRecoverCar = (id: ID, text?: ReactNode) => {
    setRecoverCar({ id, text });
  };

  const closeRecoverModal = () => {
    setRecoverCar(null);
  };

  const rows = useGetRows(cars?.content);
  const totalCount = cars?.totalElements;
  const headers = useGetColumns(
    refetch,
    handleClickDeletetCar,
    handleClickRecoverCar,
    handleTrueClickDeletetCar,
    toggleAddCarModal,
    handleClickAddCar,
    isVisibleActionsColum,
    true,
    newRefetch,
  );

  const closeEditModal = () => {
    closeAddCarModal();
    setChangeCarId(null);
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
    changeCarId,
    closeAddCarModal: closeEditModal,
    toggleAddCarModal,
    openAddCarModal,
    handleClickAddCar, // Добавляем недостающую функцию
  };

  const deleteCarModalData = {
    closeDeleteModal,
    deleteCar,
    handleClickDeletetCar, // Добавляем недостающую функцию
  };

  const deleteTrueCarModalData = {
    closeTrueDeleteModal,
    trueDeleteCar,
    handleTrueClickDeletetCar, // Добавляем недостающую функцию
  };

  const recoverCarModalData = {
    closeRecoverModal,
    recoverCar,
    isOpen: !!recoverCar,
    closeAside: handleCloseAside,
    handleClickRecoverCar, // Добавляем недостающую функцию
  };

  return {
    deleteCarModalData,
    recoverCarModalData,
    deleteTrueCarModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
