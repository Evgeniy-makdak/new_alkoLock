// useNavBar.ts
import { StorageKeys } from '@shared/const/storageKeys';
import { useLocalStorage } from '@shared/hooks/useLocalStorage';

import { useNavBarApi } from '../api/useNavBarApi';
import { getPermissionsForPages, hasPermissionForThisPage } from '../lib/getPermissionsForPages';

export const useNavBar = () => {
  // Состояние переключателя
  const { state: sliderState, setItemState: setSliderState } = useLocalStorage({
    key: StorageKeys.NAVBAR_SLIDER_STATE,
    value: true,
  });

  // Передаем состояние переключателя в useNavBarApi
  const { userData, isLoadingAccountData, length } = useNavBarApi(sliderState);
  const email = userData?.email || '-';

  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  const permissionsPath = hasPermissionForThisPage(userData?.permissions);
  const permissionsFilter = getPermissionsForPages(permissionsPath);

  return {
    userData,
    isLoadingAccountData,
    length,
    email,
    permissionsFilter,
    sliderState,
    setSliderState,
  };
};
