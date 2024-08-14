import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { UsersTable } from '@widgets/users_table';

import { useUsers } from '../hooks/useUsers';

const Users = () => {
  const { tabs, onClickRow, selectedUserId, handleCloseAside } = useUsers();
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
