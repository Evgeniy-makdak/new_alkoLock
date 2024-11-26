import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { Aside } from '@shared/ui/aside';
import { AvtoServiceTable } from '@widgets/auto_service_table';

import { useAutoService } from '../hooks/useAutoService';
import { useRef } from 'react';
import { appStore } from '@shared/model/app_store/AppStore';

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
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore((state) => state);

  const handleBranchChange = () => {
    const event = new CustomEvent('resetFilters'); // Генерируем событие сброса фильтров
    window.dispatchEvent(event);
  };

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleCloseAside();
    handleBranchChange();
  }
  return (
    <>
      <PageWrapper>
        <AvtoServiceTable handleClickRow={onClickRow} onBranchChange={handleBranchChange} />
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
