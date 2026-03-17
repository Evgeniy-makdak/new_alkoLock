import React, { useCallback, useEffect, useRef } from 'react';

import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { AttachmentsTable } from '@widgets/attachments_table/ui/AttachmentsTable';

const Attachments = () => {
  const prevBranch = useRef<unknown>(undefined);
  const { selectedBranchState } = appStore((state) => state);

  const handleBranchChange = useCallback(() => {
    const event = new CustomEvent('resetFilters'); // Генерируем событие сброса фильтров
    window.dispatchEvent(event);
  }, []);

  useEffect(() => {
    if (prevBranch.current !== selectedBranchState?.id) {
      prevBranch.current = selectedBranchState?.id;
      handleBranchChange();
    }
  }, [selectedBranchState?.id, handleBranchChange]);

  return (
    <PageWrapper>
      <AttachmentsTable onBranchChange={handleBranchChange} prevBranch={selectedBranchState?.id} />
    </PageWrapper>
  );
};

export default Attachments;
