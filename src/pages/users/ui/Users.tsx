import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { UsersTable } from '@widgets/users_table';

import { useUsers } from '../hooks/useUsers';
import { appStore } from '@shared/model/app_store/AppStore';
import { useRef } from 'react';

const Users = () => {
  const prevBranch = useRef(null);
  const { tabs, onClickRow, selectedUserId, handleCloseAside } = useUsers();
  const { selectedBranchState } = appStore(
    (state) => state,
  );

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
  }

  return (
    <>
      <PageWrapper>
        <UsersTable onRowClick={onClickRow} handleCloseAside={handleCloseAside} />
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
