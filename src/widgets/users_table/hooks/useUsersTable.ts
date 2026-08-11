import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

// import { UsersApi } from '@shared/api/baseQuerys';
import { InputSearchDelay, Permissions } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { useUsersTableApi } from '../api/useUsersTableApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { getUsersTableDisplayTotal } from '../lib/usersTableSystemUsers';
import { useUsersTableStore } from '../model/usersTableStore';

export const useUsersTable = (
  handleCloseAside: () => void,
  selectedUserId: ID | null,
  targetPageFromNavigation?: number | null,
  enableAutoClose = true,
) => {
  const [statusFilter, setStatusFilter] = useState<'Все' | 'Активные' | 'Неактивные'>('Все');
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.USERS_TABLE,
  );

  const permissions = appStore((state) => state.permissions);
  // const selectedBranchState = appStore((state) => state.selectedBranchState);
  const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  const isVisibleActionsColum =
    !permissions.includes(Permissions.PERMISSION_USER_READ) ||
    permissions.includes(Permissions.PERMISSION_USER_CREATE);

  const [deleteUser, setDeleteUser] = useState<{ id: ID; text: ReactNode } | null>(null);
  const [changeUserId, setChangeUserId] = useState<ID>(null);

  const [openAddUserModal, toggleAddUserModal, closeAddUserModal] = useToggle(false);

  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } = useUsersTableStore();
  const [recoverUser, setRecoverUser] = useState<{ id: ID; text?: ReactNode } | null>(null);
  const [trueDeleteUser, setTrueDeleteUser] = useState<{ id: ID; text?: ReactNode } | null>(null);

  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { users, isLoading, refetch } = useUsersTableApi({
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

  // Используем ref для хранения предыдущего selectedUserId
  const prevSelectedUserIdRef = useRef<ID | null>(null);

  // Используем ref для предотвращения повторных вызовов
  const isClosingRef = useRef(false);

  // Основная логика проверки существования пользователя
  useEffect(() => {
    if (!enableAutoClose) {
      prevSelectedUserIdRef.current = selectedUserId;
      return;
    }

    // Если нет выбранного пользователя или нет данных - выходим
    if (!selectedUserId || !users?.content) {
      prevSelectedUserIdRef.current = selectedUserId;
      return;
    }

    // Во время перехода по ссылке на конкретную страницу не закрываем aside
    // на промежуточных данных старой страницы.
    if (targetPageFromNavigation != null) {
      prevSelectedUserIdRef.current = selectedUserId;
      return;
    }

    // Проверяем, изменился ли selectedUserId
    const userIdChanged = prevSelectedUserIdRef.current !== selectedUserId;
    prevSelectedUserIdRef.current = selectedUserId;

    // Если пользователь только что был выбран (userIdChanged), не закрываем aside
    if (userIdChanged) {
      return;
    }

    // Проверяем, находится ли выбранный пользователь на текущей странице
    const userExistsOnCurrentPage = users.content.some(
      (user: { id: ID }) => String(user.id) === String(selectedUserId),
    );

    // Если пользователя нет на текущей странице И мы не в процессе закрытия
    if (!userExistsOnCurrentPage && !isClosingRef.current) {
      isClosingRef.current = true;

      // Добавляем небольшую задержку для предотвращения "дребезга"
      const timer = setTimeout(() => {
        handleCloseAside();
        isClosingRef.current = false;
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [users, selectedUserId, handleCloseAside, targetPageFromNavigation, enableAutoClose]);

  // Сбрасываем флаг при размонтировании
  useEffect(() => {
    return () => {
      isClosingRef.current = false;
    };
  }, []);

  const newRefetch = async () => {
    refetch();
  };

  const handleStatusChange = (status: 'Все' | 'Активные' | 'Неактивные') => {
    setStatusFilter(status); // Обновляем состояние
  };

  const handleClickRecoverUser = (id: ID, text?: ReactNode) => {
    setRecoverUser({ id, text });
  };

  const handleClickTrueDeleteUser = (id: ID, text?: ReactNode) => {
    setTrueDeleteUser({ id, text });
  };

  const closeRecoverModal = () => {
    setRecoverUser(null);
  };

  const closeTrueDeleteModal = () => {
    setTrueDeleteUser(null);
  };

  const handleClickDeletetUser = (id: ID, text?: ReactNode) => {
    // Закрываем другие модальные окна перед открытием нового
    closeAddUserModal();
    setRecoverUser(null);
    setTrueDeleteUser(null);
    setDeleteUser({
      id,
      text: text || `пользователя с ID: ${id}`,
    });
  };

  const closeDeleteModal = () => {
    setDeleteUser(null);
  };

  const handleClickAddUser = (id: ID) => {
    // Закрываем другие модальные окна перед открытием нового
    setDeleteUser(null);
    setRecoverUser(null);
    setTrueDeleteUser(null);
    setChangeUserId(id);

    // Если модальное окно уже открыто, сначала закрываем его, затем открываем заново
    if (openAddUserModal) {
      closeAddUserModal();
      setTimeout(() => {
        toggleAddUserModal();
      }, 10);
    } else {
      toggleAddUserModal();
    }
  };

  const rows = useGetRows({ data: users?.content, excludeUserIds: [] });
  const totalCount = useMemo(
    () => getUsersTableDisplayTotal(users?.totalElements, statusFilter),
    [users?.totalElements, statusFilter],
  );
  const headers = useGetColumns(
    refetch,
    handleClickDeletetUser,
    handleClickRecoverUser,
    handleClickTrueDeleteUser,
    toggleAddUserModal,
    handleClickAddUser,
    isVisibleActionsColum,
    true,
    newRefetch,
  );

  const closeEditModal = () => {
    closeAddUserModal();
    setChangeUserId(null);
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
    statusFilter,
    handleStatusChange,
  };

  const addModalData = {
    changeUserId,
    closeAddUserModal: closeEditModal,
    toggleAddUserModal,
    openAddUserModal,
    handleClickAddUser, // Добавляем функцию для мобильной версии
  };

  const deleteUserModalData = {
    closeDeleteModal,
    deleteUser,
    isOpen: !!deleteUser,
    closeAside: handleCloseAside,
    handleClickDeletetUser, // Добавляем функцию для открытия модального окна
  };

  const recoverUserModalData = {
    closeRecoverModal,
    recoverUser,
    isOpen: !!recoverUser,
    closeAside: handleCloseAside,
    handleClickRecoverUser, // Добавляем функцию для мобильной версии
  };

  const trueDeleteUserModalData = {
    closeTrueDeleteModal,
    trueDeleteUser,
    isOpen: !!trueDeleteUser,
    closeAside: handleCloseAside,
    handleClickTrueDeleteUser, // Добавляем функцию для мобильной версии
  };

  return {
    deleteUserModalData,
    recoverUserModalData,
    trueDeleteUserModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
