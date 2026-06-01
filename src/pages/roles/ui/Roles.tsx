import { useRef } from 'react';

import { PageWrapper } from '@layout/page_wrapper';
import { appStore } from '@shared/model/app_store/AppStore';
import { RolesTable_new } from '@widgets/roles_table_new';

const Roles = () => {
  const prevBranch = useRef(null);
  const { selectedBranchState } = appStore((state) => state);

  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
  }

  return (
    <PageWrapper>
      <RolesTable_new prevBranch={prevBranch.current} />
    </PageWrapper>
  );
};

export default Roles;
