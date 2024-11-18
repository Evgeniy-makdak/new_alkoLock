import { useEffect, useRef } from 'react';
import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { AlkolocksTable } from '@widgets/alkolocks_table';

import { useAlkozamki } from '../hooks/useAlkozamki';
import { appStore } from '@shared/model/app_store/AppStore';
import { ID } from '@shared/types/BaseQueryTypes';

const Alkozamki = () => {
  const prevBranch = useRef<ID | null>(null);
  const { tabs, selectedAlcolockId, onClickRow, handleCloseAside } = useAlkozamki();
  const { selectedBranchState } = appStore((state) => state);

  useEffect(() => {
    if (prevBranch.current !== selectedBranchState?.id) {
      prevBranch.current = selectedBranchState?.id;
      handleCloseAside();
    }
  }, [selectedBranchState?.id, handleCloseAside]);

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
