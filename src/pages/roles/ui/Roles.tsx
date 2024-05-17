import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageWrapper } from '@layout/page_wrapper';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { appStore } from '@shared/model/app_store/AppStore';
import { RolesTable } from '@widgets/roles_table';

const Roles = () => {
  const navigate = useNavigate();
  const isAdmin = appStore.getState().isAdmin;
  useEffect(() => {
    if (!isAdmin) {
      navigate(RoutePaths.events);
    }
  }, [isAdmin]);

  return (
    <PageWrapper>
      <RolesTable />
    </PageWrapper>
  );
};

export default Roles;
