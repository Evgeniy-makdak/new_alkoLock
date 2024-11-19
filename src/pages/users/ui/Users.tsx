import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { UsersTable } from '@widgets/users_table';

import { useUsers } from '../hooks/useUsers';
import { appStore } from '@shared/model/app_store/AppStore';
import { useRef, useEffect } from 'react';

const Users = () => {
  const prevBranch = useRef(null);
  const { tabs, onClickRow, selectedUserId, handleCloseAside } = useUsers();
  const { selectedBranchState } = appStore((state) => state);

  const handleResetFilters = () => {
    const event = new CustomEvent('resetFilters');
    window.dispatchEvent(event);
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
        />
      </PageWrapper>

      {selectedUserId && (
        <Aside onClose={handleCloseAside}>
          <RowTableInfo tabs={tabs} />
        </Aside>
      )}
    </>
  );
};

export default Users;
