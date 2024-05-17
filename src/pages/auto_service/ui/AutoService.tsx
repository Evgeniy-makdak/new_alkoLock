import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { AvtoServiceTable } from '@widgets/auto_service_table';

import { useAutoService } from '../hooks/useAutoService';

const AutoService = () => {
  const {
    // selectedBranch,
    selectedItemId,
    // updateTable,
    // loading,
    tabs,
    onClickRow,
    // toggleUpdateAfterTimeout,
    handleCloseAside,
  } = useAutoService();
  return (
    <>
      <PageWrapper>
        <AvtoServiceTable handleClickRow={onClickRow} />
      </PageWrapper>

      {selectedItemId && (
        <Aside onClose={handleCloseAside}>
          <RowTableInfo tabs={tabs} />
        </Aside>
      )}
    </>
  );
};

export default AutoService;
