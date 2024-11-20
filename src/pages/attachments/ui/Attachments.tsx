import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { AttachmentsTable } from '@widgets/attachments_table/ui/AttachmentsTable';
import { useRef } from 'react';

const Attachments = () => {
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore((state) => state);

  const handleBranchChange = () => {
    const event = new CustomEvent('resetFilters'); // Генерируем событие сброса фильтров
    window.dispatchEvent(event);
  };

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
    handleBranchChange();
  }
  return (
    <PageWrapper>
      <AttachmentsTable onBranchChange={handleBranchChange} />
    </PageWrapper>
  );
};

export default Attachments;
