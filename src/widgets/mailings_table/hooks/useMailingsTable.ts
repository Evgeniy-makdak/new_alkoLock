import { type ReactNode, useState } from 'react';

import { InputSearchDelay, Permissions } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useMailingsTableApi } from '../api/useMailingsTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useMailingTableStore } from '../model/mailingsTableStore';

export const useMailingsTable = () => {
  const [statusFilter, setStatusFilter] = useState<'Все' | 'Активные' | 'Неактивные'>('Все');
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.EMAILS_TABLE,
  );

  const permissions = appStore((state) => state.permissions);
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);

  const hasMailingsReadPermission = permissions.includes(Permissions.PERMISSION_NOTIFICATIONS_READ);
  const hasMailingsCreatePermission = permissions.includes(
    Permissions.PERMISSION_NOTIFICATIONS_CREATE,
  );

  const isVisibleActionsColum =
    hasMailingsReadPermission || hasMailingsCreatePermission || isGlobalAdmin;

  const [deleteMailing, setDeleteMailing] = useState<{ id: ID; text: ReactNode } | null>(null);
  const [changeMailingEmail, setChangeMailingEmail] = useState<ID>(null);

  const [openAddMailingModal, toggleAddMailingModal, closeAddMailingModal] = useToggle(false);

  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } = useMailingTableStore();
  const [recoverMailing, setRecoverMailing] = useState<{ id: ID; text?: ReactNode } | null>(null);
  const [trueDeleteMailing, setTrueDeleteMailing] = useState<{ id: ID; text?: ReactNode } | null>(
    null,
  );

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { mailings, isLoading, refetch } = useMailingsTableApi({
    searchQuery,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    page: state.page,
    limit: state.pageSize,
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
    isGlobalAdmin,
    statusFilter,
  });

  const handleRefetch = async () => {
    await refetch();
  };

  const handleStatusChange = (status: 'Все' | 'Активные' | 'Неактивные') => {
    setStatusFilter(status);
  };

  const handleClickRecoverMailing = (id: ID, text?: ReactNode) => {
    setRecoverMailing({ id, text });
  };

  const handleClickTrueDeleteMailing = (id: ID, text?: ReactNode) => {
    setTrueDeleteMailing({ id, text });
  };

  const closeRecoverModal = () => {
    setRecoverMailing(null);
  };

  const closeTrueDeleteModal = () => {
    setTrueDeleteMailing(null);
  };

  const handleClickDeletetMailing = (id: ID, text?: ReactNode) => {
    closeAddMailingModal();
    setRecoverMailing(null);
    setTrueDeleteMailing(null);
    setDeleteMailing({
      id,
      text: text || `рассылку для email: ${id}`,
    });
  };

  const closeDeleteModal = () => {
    setDeleteMailing(null);
  };

  const handleClickAddUser = (id: ID, email?: string) => {
    setDeleteMailing(null);
    setRecoverMailing(null);
    setTrueDeleteMailing(null);
    setChangeMailingEmail(email || id);

    if (openAddMailingModal) {
      closeAddMailingModal();
      setTimeout(() => {
        toggleAddMailingModal();
      }, 10);
    } else {
      toggleAddMailingModal();
    }
  };

  const rows = useGetRows({ data: mailings?.content });
  const totalCount = mailings?.totalElements;

  const headers = useGetColumns(
    handleRefetch,
    handleClickDeletetMailing,
    handleClickRecoverMailing,
    handleClickTrueDeleteMailing,
    toggleAddMailingModal,
    handleClickAddUser,
    isVisibleActionsColum,
    true,
    handleRefetch,
  );

  const closeEditModal = () => {
    closeAddMailingModal();
    setChangeMailingEmail(null);
    handleRefetch();
  };

  // Добавляем метод changePage для мобильной версии
  const changePage = (newPage: number) => {
    changeTableState({ page: newPage, pageSize: state.pageSize });
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
    // Добавляем методы для мобильной версии
    changePage,
    pageSize: state.pageSize,
  };

  const filtersData = {
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    startDate,
    setInput,
    input,
    statusFilter,
    handleStatusChange,
  };

  const addModalData = {
    changeMailingId: changeMailingEmail,
    closeAddMailingModal: closeEditModal,
    toggleAddMailingModal,
    openAddMailingModal,
    handleClickAddUser,
    onSuccess: handleRefetch,
  };

  const deleteMailingModalData = {
    closeDeleteModal,
    deleteMailing,
    isOpen: !!deleteMailing,
    handleClickDeletetMailing,
    onSuccess: handleRefetch,
  };

  const recoverMailingModalData = {
    closeRecoverModal,
    recoverMailing,
    isOpen: !!recoverMailing,
    handleClickRecoverMailing,
    onSuccess: handleRefetch,
  };

  const trueDeleteMailingModalData = {
    closeTrueDeleteModal,
    trueDeleteMailing,
    isOpen: !!trueDeleteMailing,
    handleClickTrueDeleteMailing,
    onSuccess: handleRefetch,
  };

  return {
    deleteMailingModalData,
    recoverMailingModalData,
    trueDeleteMailingModalData,
    addModalData,
    tableData,
    filtersData,
    handleRefetch,
  };
};
