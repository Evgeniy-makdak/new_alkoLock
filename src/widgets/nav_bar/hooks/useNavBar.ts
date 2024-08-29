import { useNavBarApi } from '../api/useNavBarApi';
import { getPermissionsForPages, hasPermissionForThisPage } from '../lib/getPermissionsForPages';

export const useNavBar = () => {
  const { userData, isLoadingAccountData, length } = useNavBarApi();
  const email = userData?.email || '-';

  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  const permissionsPath = hasPermissionForThisPage(userData?.permissions);
  const permissionsFilter = getPermissionsForPages(permissionsPath);

  return { userData, isLoadingAccountData, length, email, permissionsFilter };
};
