/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable react-hooks/exhaustive-deps */
import { type ReactNode, useEffect, useState } from 'react';

import { InputSearchDelay, Permissions } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useAlkolocksApi } from '../api/alkolocksApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useAlcolocksStore } from '../model/alkolocksStore';

export const useAlkolocksTable = (handleCloseAside: () => void, selectedAlcolockId: ID | null) => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.ALCOLOCKS_TABLE,
  );

  const permissions = appStore((state) => state.permissions);
  const isVisibleActionsColum =
    !permissions.includes('PERMISSION_DEVICE_READ') ||
    permissions.includes('PERMISSION_DEVICE_CREATE');
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  const [deleteAlcolock, setDeleteAlcolock] = useState<{ id: ID; text: ReactNode } | null>(null);
  const [recoverAlkolock, setRecoverAlkolock] = useState<{ id: ID; text: ReactNode } | null>(null);
  const [changeAlkolockId, setChangeAlkolockId] = useState<ID>(null);
  const [trueDeleteAlcolock, setTrueDeleteAlcolock] = useState<{ id: ID; text: ReactNode } | null>(
    null,
  );
  const [forceSelectedId, setForceSelectedId] = useState<ID | null>(null);
  const [isApiRefReady, setIsApiRefReady] = useState(false);

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
    isGlobalAdmin,
  });

  // Эффект для сброса forceSelectedId после загрузки данных
  useEffect(() => {
    if (
      forceSelectedId &&
      data?.content?.some((item: { id: any }) => item.id === forceSelectedId)
    ) {
      setForceSelectedId(null);
    }
  }, [data, forceSelectedId]);

  const newRefetch = async () => {
    await refetch();
  };

  const handleClickDeletetAlcolock = (id: ID, text?: ReactNode) => {
    setDeleteAlcolock({ id, text });
  };

  const closeDeleteModal = () => {
    setDeleteAlcolock(null);
  };

  const handleClickTrueDeletetAlcolock = (id: ID, text?: ReactNode) => {
    setTrueDeleteAlcolock({ id, text });
  };

  const closeTrueDeleteModal = () => {
    setTrueDeleteAlcolock(null);
  };

  const handleClickAddAlkolock = (id: ID) => {
    setChangeAlkolockId(id);
    toggleAddAlcolockModal();
  };

  const handleClickRecoverAlkolock = (id: ID, text?: ReactNode) => {
    setRecoverAlkolock({ id, text });
  };

  const closeRecoverModal = () => {
    setRecoverAlkolock(null);
  };

  const rows = useGetRows(data?.content);
  const totalCount = data?.totalElements;

  const headers = useGetColumns(
    refetch,
    handleClickDeletetAlcolock,
    handleClickRecoverAlkolock,
    handleClickTrueDeletetAlcolock,
    toggleAddAlcolockModal,
    handleClickAddAlkolock,
    isVisibleActionsColum,
    true,
    newRefetch,
  );

  const closeEditModal = () => {
    closeAddAlcolockModal();
    setChangeAlkolockId(null);
  };

  useEffect(() => {
    if (apiRef?.current) {
      setIsApiRefReady(true);
    }
  }, [apiRef]);

  // Эффект для обработки внешнего выбранного алкозамка - УБРАН СБРОС СТРАНИЦЫ
  useEffect(() => {
    if (selectedAlcolockId && isApiRefReady) {
      // apiRef.current?.setPage(0); // УБРАНО - не сбрасываем страницу при выборе строки
    }
  }, [selectedAlcolockId, isApiRefReady]);

  return {
    deleteAlcolockModalData: {
      closeDeleteModal,
      deleteAlcolock,
      handleClickDeletetAlcolock,
    },
    recoverAlcolockModalData: {
      closeRecoverModal,
      recoverAlkolock,
      isOpen: !!recoverAlkolock,
      closeAside: handleCloseAside,
      handleClickRecoverAlkolock,
    },
    trueDeleteAlcolockModalData: {
      closeTrueDeleteModal,
      trueDeleteAlcolock,
      handleClickTrueDeletetAlcolock,
    },
    addModalData: {
      changeAlkolockId,
      closeAddAlcolockModal: closeEditModal,
      toggleAddAlcolockModal,
      openAddAlcolockModal,
      handleClickAddAlkolock,
    },
    tableData: {
      ...state,
      totalCount,
      apiRef,
      rows,
      headers,
      changeTableState,
      changeTableSorts,
      isLoading,
      forceSelectedId,
      isApiRefReady,
    },
    filtersData: {
      changeEndDate,
      changeStartDate,
      clearDates,
      endDate,
      startDate,
      setInput,
      input,
    },
  };
};
