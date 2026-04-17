import { useEffect, useRef } from 'react';

import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { Aside } from '@shared/ui/aside';
import { UsersTable } from '@widgets/users_table';

import { useUsers } from '../hooks/useUsers';

const Users = () => {
  const prevBranch = useRef(null);
  const {
    tabs,
    onClickRow,
    selectedUserId,
    targetPageFromNavigation,
    onTargetPageApplied,
    activeTab,
    handleTabChange,
    handleCloseAside,
    // Получаем данные модальных окон из хука useUsersTable через useUsers
    addModalData,
    deleteUserModalData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recoverUserModalData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    trueDeleteUserModalData,
  } = useUsers();
  const { selectedBranchState } = appStore((state) => state);

  const handleResetFilters = () => {
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);
  };

  // Обработчики для мобильной версии
  const handleAddUser = () => {
    addModalData.toggleAddUserModal();
  };

  const handleEditUser = (id: string | number) => {
    // Для мобильной версии открываем форму редактирования
    addModalData.handleClickAddUser(id);
  };

  const handleDeleteUser = (id: string | number) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Находим пользователя по ID и открываем модальное окно удаления
    const user = { id, text: `пользователя с ID: ${id}` };
    // Используем правильное имя метода для открытия модального окна
    deleteUserModalData.handleClickDeletetUser(id, user.text);
  };

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
  }

  useEffect(() => {
    // Очистка фильтров при изменении выбранного филиала
    handleResetFilters();
  }, [selectedBranchState?.id]);

  return (
    <>
      <PageWrapper>
        <UsersTable
          onRowClick={onClickRow}
          handleCloseAside={handleCloseAside}
          onBranchChange={handleResetFilters}
          selectedUserId={selectedUserId}
          targetPageFromNavigation={targetPageFromNavigation}
          onTargetPageApplied={onTargetPageApplied}
          onAddUser={handleAddUser}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      </PageWrapper>

      {selectedUserId && (
        <Aside onClose={handleCloseAside} fullScreenOnMobile>
          <RowTableInfo tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
        </Aside>
      )}
    </>
  );
};

export default Users;
