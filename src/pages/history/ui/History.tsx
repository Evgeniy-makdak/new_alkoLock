/* eslint-disable @typescript-eslint/no-unused-vars */
import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
// import { HistoryInfo } from '@widgets/history_info';
import { HistoryTable } from '@widgets/history_table';

import { useHistoryPage } from '../hooks/useHistoryPage';

const History = () => {
  const { handleClickRow, handleCloseAside, selectedHistoryId, tabs } = useHistoryPage();

  return (
    <>
      <PageWrapper>
        <HistoryTable handleClickRow={handleClickRow} />
      </PageWrapper>

      {selectedHistoryId && (
        <Aside onClose={handleCloseAside}>
          <RowTableInfo tabs={tabs} />
        </Aside>
      )}
    </>
  );
};

export default History;
