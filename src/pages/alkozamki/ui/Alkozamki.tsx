import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { AlkolocksTable } from '@widgets/alkolocks_table';

import { useAlkozamki } from '../hooks/useAlkozamki';

const Alkozamki = () => {
  const { tabs, selectedAlcolockId, onClickRow, handleCloseAside } = useAlkozamki();
  return (
    <>
      <PageWrapper>
        <AlkolocksTable handleClickRow={onClickRow} />
      </PageWrapper>

      {selectedAlcolockId && (
        <Aside onClose={handleCloseAside}>
          <RowTableInfo tabs={tabs} />
        </Aside>
      )}
    </>
  );
};

export default Alkozamki;
