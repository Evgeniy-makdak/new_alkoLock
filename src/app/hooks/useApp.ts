import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { onFetchDataHandling } from '@app/lib/onFetchDataHandling';
import { Permissions } from '@shared/config/permissionsEnums';
import type { RoutePaths } from '@shared/config/routePathsEnum';
import { appStore } from '@shared/model/app_store/AppStore';
import { setStore } from '@shared/model/store/localStorage';
import { getFirstAvailableRouter } from '@widgets/nav_bar';
import { NAV_LINKS } from '@widgets/nav_bar/config/const';

import { useAppApi } from '../api/useAppApi';

setStore(window.localStorage);

export const useApp = () => {
  const auth = appStore((state) => state.auth);
  const logout = appStore((state) => state.logout);
  const { isLoading, user, error } = useAppApi();
  const navigate = useNavigate();
  const location = useLocation();
  const pathName = location.pathname as RoutePaths;
  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  const { permissionsPath, firstAvailableRouter } = getFirstAvailableRouter(user?.permissions);

  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  useEffect(() => {
    if (isLoading || !user) return;
    if (user?.permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN)) return;
    const hasAccess = pathName in permissionsPath && permissionsPath[pathName];
    if (hasAccess) return;
    if (!hasAccess) {
      const pathDisplayName = NAV_LINKS.find((link) => link.path === pathName);
      enqueueSnackbar(`У вас нет доступа к странице "${pathDisplayName.name}"`, {
        variant: 'error',
      });
      if (!firstAvailableRouter) {
        enqueueSnackbar(`У вас нет доступа к Админ панели`, {
          variant: 'error',
        });
        logout();
        return;
      }
      navigate(firstAvailableRouter);
    }
  }, [pathName, user, isLoading]);

  useEffect(() => {
    if (isLoading || auth) return;
    onFetchDataHandling({
      error,
      user,
      location,
      navigate,
      auth,
      route: firstAvailableRouter,
    });
  }, [error, isLoading, user, auth]);

  return { isLoading };
};
