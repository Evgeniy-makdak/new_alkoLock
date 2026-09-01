/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { onFetchDataHandling } from '@app/lib/onFetchDataHandling';
import { Permissions } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { appStore } from '@shared/model/app_store/AppStore';
import { setStore } from '@shared/model/store/localStorage';
import { getFirstAvailableRouter } from '@widgets/nav_bar';

// import { NAV_LINKS } from '@widgets/nav_bar/config/const';
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
  const setState = appStore((state) => state.setState);
  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  useEffect(() => {
    if (isLoading || !user) return;
    if (user?.permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN)) return;

    // /operator-chat-popup — только окно Electron, не точка входа в браузере
    if (
      pathName === RoutePaths.operatorChatPopup &&
      typeof window !== 'undefined' &&
      !window.alcolockDesktop
    ) {
      if (firstAvailableRouter) {
        navigate(firstAvailableRouter, { replace: true });
        return;
      }
      enqueueSnackbar(`У вас нет доступа к Админ панели`, {
        variant: 'error',
      });
      logout(true);
      return;
    }

    const hasAccess = pathName in permissionsPath && permissionsPath[pathName];
    if (hasAccess) return;
    if (!hasAccess) {
      // const pathDisplayName = NAV_LINKS.find((link) => link.path === pathName);
      // enqueueSnackbar(`У вас нет доступа к странице "${pathDisplayName.name}"`, {
      //   variant: 'error',
      // });
      if (!firstAvailableRouter) {
        enqueueSnackbar(`У вас нет доступа к Админ панели`, {
          variant: 'error',
        });
        logout(true);
        return;
      }
      navigate(firstAvailableRouter, { replace: true });
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
      setState,
    });
  }, [error, isLoading, user, auth]);

  return { isLoading };
};
