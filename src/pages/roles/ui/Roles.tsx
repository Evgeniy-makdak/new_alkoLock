/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { PageWrapper } from '@layout/page_wrapper';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { appStore } from '@shared/model/app_store/AppStore';
import { RolesTable } from '@widgets/roles_table';

const Roles = () => {
  const navigate = useNavigate();
  const isAdmin = appStore.getState().isAdmin;
  const prevBranch = useRef(null); // Храним предыдущее значение branchId
  const { selectedBranchState } = appStore((state) => state); // Получаем текущий филиал

  // Проверяем, изменился ли branchId, и обновляем prevBranch
  if (prevBranch.current !== selectedBranchState?.id) {
    prevBranch.current = selectedBranchState?.id;
  }

  // Проверка прав администратора
  useEffect(() => {
    if (!isAdmin) {
      navigate(RoutePaths.events);
    }
  }, [isAdmin]);

  return (
    <PageWrapper>
      <RolesTable prevBranch={prevBranch.current} />
    </PageWrapper>
  );
};

export default Roles;
