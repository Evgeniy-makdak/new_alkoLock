import {
  permissionsListIncludes,
} from '@features/role_add_change_form';
import { Permissions } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';

import type { TypeNavLink } from '../config/const';
import type { TypeNavPath } from './../config/const';

export const getPermissionsForPages = (permissionForThisPage: HasPermissionForThisPageReturn) => {
  return function (path: TypeNavLink) {
    return permissionForThisPage[path.path];
  };
};

type HasPermissionForThisPageReturn = Partial<{
  [key in TypeNavPath]: boolean;
}>;

const routePermissionsMap: Record<RoutePaths, Permissions[]> = {
  [RoutePaths.events]: [
    Permissions.PERMISSION_EVENTS_READ,
    Permissions.PERMISSION_EVENTS_READ_ONLY_ROLE,
    Permissions.SYSTEM_DRIVER_ACCOUNT,
    Permissions.SYSTEM_SERVICE_ACCOUNT,
  ],
  [RoutePaths.users]: [
    Permissions.PERMISSION_USER_READ,
    Permissions.PERMISSION_USER_CREATE,
    Permissions.PERMISSION_USER_EDIT,
  ],
  [RoutePaths.roles]: [
    Permissions.PERMISSION_ROLE_READ,
    Permissions.PERMISSION_ROLE_CREATE,
    Permissions.PERMISSION_ROLE_EDIT,
  ],
  [RoutePaths.groups]: [
    Permissions.PERMISSION_ROLE_READ, // Группы связаны с ролями
  ],
  [RoutePaths.tc]: [
    Permissions.PERMISSION_VEHICLE_READ,
    Permissions.PERMISSION_VEHICLE_CREATE,
    Permissions.PERMISSION_VEHICLE_EDIT,
  ],
  [RoutePaths.alkozamki]: [
    Permissions.PERMISSION_DEVICE_READ,
    Permissions.PERMISSION_DEVICE_CREATE,
    Permissions.PERMISSION_DEVICE_EDIT,
  ],
  [RoutePaths.autoService]: [
    Permissions.PERMISSION_SERVICE_MODE_READ,
    Permissions.PERMISSION_SERVICE_MODE_CREATE,
    Permissions.PERMISSION_SERVICE_MODE_EDIT,
  ],
  [RoutePaths.attachments]: [
    Permissions.PERMISSION_BINDINGS_READ,
    Permissions.PERMISSION_BINDINGS_CREATE,
    Permissions.PERMISSION_BINDINGS_EDIT,
  ],
  [RoutePaths.historyAutoService]: [
    Permissions.PERMISSION_SERVICE_MODE_HISTORY_READ,
  ],
  [RoutePaths.all]: [],
  [RoutePaths.root]: [],
  [RoutePaths.auth]: [],
  [RoutePaths.changePassword]: [],
  [RoutePaths.forgetPassword]: [],
  [RoutePaths.resetPassword]: [],
};

export const hasPermissionForThisPage = (
  permissionsList: Permissions[],
): HasPermissionForThisPageReturn => {
  if (!permissionsList) {
    return {};
  }

  const permissionsIncludes = permissionsListIncludes(permissionsList);
  const isGlobalAdmin = permissionsIncludes(Permissions.SYSTEM_GLOBAL_ADMIN);

  // Глобальный администратор имеет доступ ко всем маршрутам
  if (isGlobalAdmin) {
    return Object.keys(routePermissionsMap).reduce((acc, route) => {
      acc[route as RoutePaths] = true;
      return acc;
    }, {} as HasPermissionForThisPageReturn);
  }

  // Логика для "Водителя"
  const isService = permissionsList.includes(Permissions.SYSTEM_SERVICE_ACCOUNT);
  const isDriver = permissionsList.includes(Permissions.SYSTEM_DRIVER_ACCOUNT);
  const hasEventReadOnly = permissionsList.includes(Permissions.PERMISSION_EVENTS_READ_ONLY_ROLE);

  if (isDriver && hasEventReadOnly) {
    return {
      [RoutePaths.events]: true,
    };
  }

  if (isService && hasEventReadOnly) {
    return {
      [RoutePaths.events]: true,
    };
  }

  // Общая логика проверки доступов
  return Object.entries(routePermissionsMap).reduce((acc, [route, requiredPermissions]) => {
    acc[route as RoutePaths] = requiredPermissions.some((permission) =>
      permissionsList.includes(permission),
    );
    return acc;
  }, {} as HasPermissionForThisPageReturn);
};

export const getFirstAvailableRouter = (permissionsList: Permissions[]) => {
  const permissionsPath = hasPermissionForThisPage(permissionsList);

  const firstAvailableRouter = Object.entries(permissionsPath).find(
    ([, hasAccess]) => hasAccess,
  )?.[0];

  return { permissionsPath, firstAvailableRouter };
};
