/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { StorageKeys } from '@shared/const/storageKeys';
import { useLocalStorage } from '@shared/hooks/useLocalStorage';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useUserDataApi } from '../api/useUserDataApi';

/**
 * Как в {@link useNavbarBranchSelect}: выставляет selectedBranchState из localStorage OFFICE
 * после загрузки списка филиалов. Нужен на маршрутах без NavBar (окно operator-chat-popup),
 * иначе в appStore не попадает выбранный филиал и запросы с branchId не уходят.
 */
export function useSelectedBranchOfficeSync() {
  const { setState, isAdmin, assignmentBranch, auth } = appStore((state) => state);
  const { isLoading, branchList } = useUserDataApi();
  const { state: office, setItemState: setOffice } = useLocalStorage({
    key: StorageKeys.OFFICE,
    value: assignmentBranch,
  });

  useEffect(() => {
    if (isLoading || !branchList || !auth) return;
    const hasBranch = branchList.find(
      (branchInBase: { id: ID }) => branchInBase?.id === office?.id,
    );
    const value =
      isAdmin && hasBranch
        ? { id: hasBranch?.id, name: hasBranch?.name }
        : { id: branchList[0].id, name: branchList[0].name };
    setOffice(value);
    setState({
      selectedBranchState: value,
    });
  }, [isLoading, auth]);

  return { setOffice };
}
