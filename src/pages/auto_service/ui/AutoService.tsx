import { useCallback, useEffect, useRef } from 'react';

import { RowTableInfo } from '@entities/row_table_info';
import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { Aside } from '@shared/ui/aside';
import { AvtoServiceTable } from '@widgets/auto_service_table';

import { useAutoService } from '../hooks/useAutoService';

const AutoService = () => {
  const { selectedItemId, tabs, onClickRow, handleCloseAside } = useAutoService();
  const prevBranchId = useRef<unknown>(undefined);
  const { selectedBranchState } = appStore((state) => state);

  const handleBranchChange = useCallback(() => {
    const event = new CustomEvent('resetFilters'); // Генерируем событие сброса фильтров
    window.dispatchEvent(event);
  }, []);

  useEffect(() => {
    if (prevBranchId.current !== selectedBranchState?.id) {
      prevBranchId.current = selectedBranchState?.id;
      handleCloseAside();
      handleBranchChange();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене филиала; handleCloseAside/handleBranchChange стабильны по смыслу
  }, [selectedBranchState?.id]);

  return (
    <>
      <PageWrapper>
        <AvtoServiceTable
          handleClickRow={onClickRow}
          onBranchChange={handleBranchChange}
          handleCloseAside={handleCloseAside}
        />
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
