/* eslint-disable @typescript-eslint/no-unused-vars */
import { useRef } from 'react';

import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { HistoryTable } from '@widgets/history_table';

const History = () => {
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore((state) => state); // Получаем текущий филиал

  // Обновляем prevBranch при изменении филиала
  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
  }

  return (
    <>
      <PageWrapper>
        <HistoryTable prevBranch={prevBranch.current} />
      </PageWrapper>
    </>
  );
};

export default History;
