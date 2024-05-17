import type { Location, NavigateFunction } from 'react-router-dom';

import type { AxiosError } from 'axios';

import { Permissions } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAccount, IError } from '@shared/types/BaseQueryTypes';

type OnFetchDataHandlingArgs = {
  error: AxiosError<IError>;
  user: IAccount;
  navigate: NavigateFunction;
  location: Location;
  auth: boolean;
  route: Partial<keyof typeof RoutePaths> | string;
};

export const onFetchDataHandling = ({
  error,
  user,
  navigate,
  location,
  auth,
  route,
}: OnFetchDataHandlingArgs) => {
  const isAdmin = (user?.permissions || []).includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  if (user) {
    appStore.setState({
      auth: true,
      email: user?.email,
      assignmentBranch: user?.assignment?.branch,
      permissions: user?.permissions,
      isAdmin: isAdmin,
    });
  }
  if (location?.pathname === '/' && !error && user) {
    navigate(route);
  } else if (error || (!auth && !user)) {
    navigate(RoutePaths.auth);
  }
};
