import {
  getPermissionsNumbersEntities,
  permissionsListIncludes,
} from '@features/role_add_change_form';
import { Permissions, PermissionsStatus } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';

import type { TypeNavLink } from '../config/const';
import type { TypeNavPath } from './../config/const';

export const getPermissionsForPages = (permissionForThisPage: HasPermissionForThisPageReturn) => {
  return function (path: TypeNavLink) {
    return permissionForThisPage[path.path];
  };
};

const hasNoZeroPermissions = (statuses: PermissionsStatus[]) => {
  return Math.max(...statuses) > PermissionsStatus.NO_PERMISSION;
};

type HasPermissionForThisPageReturn = Partial<{
  [key in TypeNavPath]: boolean;
}>;

export const hasPermissionForThisPage = (
  permissionsList: Permissions[],
): HasPermissionForThisPageReturn => {
  const routerPermissions = {
    [RoutePaths.events]: true,
    [RoutePaths.users]: true,
    [RoutePaths.roles]: true,
    [RoutePaths.groups]: true,
    [RoutePaths.tc]: true,
    [RoutePaths.alkozamki]: true,
    [RoutePaths.autoService]: true,
    [RoutePaths.attachments]: true,
    [RoutePaths.historyAutoService]: true,
  };
  if (!permissionsList) {
    return routerPermissions;
  }

  if (permissionsList.includes(Permissions.SYSTEM_DRIVER_ACCOUNT)) {
    routerPermissions[RoutePaths.groups] = false;
    routerPermissions[RoutePaths.events] = true;
    routerPermissions[RoutePaths.alkozamki] = false;
    routerPermissions[RoutePaths.attachments] = false;
    routerPermissions[RoutePaths.autoService] = false;
    routerPermissions[RoutePaths.roles] = false;
    routerPermissions[RoutePaths.tc] = false;
    routerPermissions[RoutePaths.historyAutoService] = false;
    routerPermissions[RoutePaths.users] = false;
    return routerPermissions;
  }

  if (permissionsList.includes(Permissions.SYSTEM_SERVICE_ACCOUNT)) {
    routerPermissions[RoutePaths.groups] = false;
    routerPermissions[RoutePaths.events] = true;
    routerPermissions[RoutePaths.alkozamki] = false;
    routerPermissions[RoutePaths.attachments] = false;
    routerPermissions[RoutePaths.autoService] = false;
    routerPermissions[RoutePaths.roles] = false;
    routerPermissions[RoutePaths.tc] = false;
    routerPermissions[RoutePaths.historyAutoService] = false;
    routerPermissions[RoutePaths.users] = false;
    return routerPermissions;
  }

  if (
    permissionsList.includes(Permissions.PERMISSION_DEVICE_CREATE) &&
    !permissionsList.includes(Permissions.SYSTEM_GLOBAL_ADMIN)
  ) {
    routerPermissions[RoutePaths.groups] = false;
    routerPermissions[RoutePaths.events] = true;
    routerPermissions[RoutePaths.alkozamki] = true;
    routerPermissions[RoutePaths.attachments] = true;
    routerPermissions[RoutePaths.autoService] = true;
    routerPermissions[RoutePaths.roles] = false;
    routerPermissions[RoutePaths.tc] = true;
    routerPermissions[RoutePaths.historyAutoService] = true;
    routerPermissions[RoutePaths.users] = true;
    return routerPermissions;
  }

  if (permissionsList.includes(Permissions.PERMISSION_DEVICE_READ)) {
    routerPermissions[RoutePaths.groups] = false;
    routerPermissions[RoutePaths.events] = true;
    routerPermissions[RoutePaths.alkozamki] = true;
    routerPermissions[RoutePaths.attachments] = true;
    routerPermissions[RoutePaths.autoService] = true;
    routerPermissions[RoutePaths.roles] = false;
    routerPermissions[RoutePaths.tc] = true;
    routerPermissions[RoutePaths.historyAutoService] = true;
    routerPermissions[RoutePaths.users] = true;
    return routerPermissions;
  }

  const permissionsIncludes = permissionsListIncludes(permissionsList);
  const isGlobalAdmin = permissionsIncludes(Permissions.SYSTEM_GLOBAL_ADMIN);
  if (isGlobalAdmin) {
    return routerPermissions;
  }
  const permission = getPermissionsNumbersEntities(permissionsList);

  routerPermissions[RoutePaths.events] = hasNoZeroPermissions(permission.eventPermission);
  routerPermissions[RoutePaths.users] = hasNoZeroPermissions(permission.userPermission);
  routerPermissions[RoutePaths.roles] = hasNoZeroPermissions(permission.rolePermission);
  routerPermissions[RoutePaths.groups] = false;
  routerPermissions[RoutePaths.tc] = hasNoZeroPermissions(permission.carPermission);
  routerPermissions[RoutePaths.alkozamki] = hasNoZeroPermissions(permission.devicePermission);
  routerPermissions[RoutePaths.autoService] = permission.devicePermission.includes(
    PermissionsStatus.EDIT,
  );
  routerPermissions[RoutePaths.historyAutoService] = permission.devicePermission.includes(
    PermissionsStatus.EDIT,
  );
  routerPermissions[RoutePaths.attachments] = hasNoZeroPermissions(
    permission.attachmentsPermission,
  );
  return routerPermissions;
};

export const getFirstAvailableRouter = (permissionsList: Permissions[]) => {
  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  const permissionsPath = hasPermissionForThisPage(permissionsList);
  // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
  const array = Object.entries(permissionsPath).filter((perm) => perm[1] === true);

  const availableRouter = array[0];

  const firstAvailableRouter = availableRouter ? availableRouter[0] : null;

  return { permissionsPath, firstAvailableRouter };
};
