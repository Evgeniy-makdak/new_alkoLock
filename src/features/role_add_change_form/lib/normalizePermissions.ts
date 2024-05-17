/* eslint-disable @typescript-eslint/no-unused-vars */
import { Entities, Permissions, PermissionsStatus } from '@shared/config/permissionsEnums';
import type { IUserGroupPermission } from '@shared/types/BaseQueryTypes';

export type NormalizePermissions = {
  user_control: number;
  car_control: number;
  alkozamki_control: number;
  attachments_control: number;
};
// TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
export function normalizePermissions(
  userGroupPermissions: IUserGroupPermission[],
): NormalizePermissions {
  const rolePermissions = {
    user_control: 3,
    car_control: 3,
    alkozamki_control: 3,
    attachments_control: 3,
  };

  if (!(userGroupPermissions ?? []).length) return rolePermissions;
  userGroupPermissions.forEach((permission) => {
    const permissionNameParts = permission.permission.name.split('_');
    const permissionArea = permissionNameParts[1];
    const availableMethod = permissionNameParts[permissionNameParts.length - 1];

    switch (availableMethod) {
      case 'CREATE':
        if (permissionArea === Entities.DEVICE) {
          rolePermissions.alkozamki_control = 1;
        } else if (permissionArea === Entities.VEHICLE) {
          rolePermissions.car_control = 1;
        } else if (permissionArea === Entities.USER) {
          rolePermissions.user_control = 1;
        }
        break;
      case 'READ':
        if (permissionArea === Entities.DEVICE) {
          rolePermissions.alkozamki_control = 2;
        } else if (permissionArea === Entities.VEHICLE) {
          rolePermissions.car_control = 2;
        } else if (permissionArea === Entities.USER) {
          rolePermissions.user_control = 2;
        }
        break;
    }
  });

  if (rolePermissions.user_control === 1 && rolePermissions.car_control === 1) {
    rolePermissions.attachments_control = 1;
  } else if (rolePermissions.user_control !== 3 && rolePermissions.car_control !== 3) {
    rolePermissions.attachments_control = 2;
  }

  return rolePermissions;
}
// TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
export const permissionsListIncludes = (permissionsList: Permissions[]) => {
  return function (permissions: Permissions): boolean {
    return (permissionsList || [])?.includes(permissions);
  };
};

type GetArrayOfStringFromPermissionReturn = {
  entities: keyof typeof Entities | null;
  status: keyof typeof PermissionsStatus | null;
};
// TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
const getArrayOfStringFromPermission = (
  permission: Permissions,
): GetArrayOfStringFromPermissionReturn => {
  const splitPermissions: (string | keyof typeof Entities | keyof typeof PermissionsStatus)[] =
    permission.split('_');
  const resultArr: GetArrayOfStringFromPermissionReturn = { entities: null, status: null };
  const entitiesArr = Object.values(Entities);
  const permissionsStatusArray: (number | string | PermissionsStatus)[] =
    Object.values(PermissionsStatus);

  splitPermissions.map((splitPermission) => {
    const findEntities = entitiesArr.find((item) => item === splitPermission) || null;
    const findPermission = permissionsStatusArray.find((item) => item === splitPermission) || null;
    if (findEntities) {
      resultArr.entities = findEntities;
    }
    if (findPermission) {
      resultArr.status = findPermission as keyof typeof PermissionsStatus;
    }
  });
  return resultArr;
};
// TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
export const permissionForEntity = (permissionsList: Permissions[]) => {
  return function (entity: Entities): PermissionsStatus[] {
    const permissionStatus: PermissionsStatus[] = [];
    (permissionsList || []).map((item) => {
      const { entities, status } = getArrayOfStringFromPermission(item);
      if (entities === entity) {
        permissionStatus.push(PermissionsStatus[status]);
      }
    });

    return permissionStatus.length > 0 ? permissionStatus : [PermissionsStatus.NO_PERMISSION];
  };
};
// TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
export const getPermissionsNumbersEntities = (permissionsList: Permissions[]) => {
  const findPermissionForEntity = permissionForEntity(permissionsList);
  const userPermission = findPermissionForEntity(Entities.USER);
  const devicePermission = findPermissionForEntity(Entities.DEVICE);
  const carPermission = findPermissionForEntity(Entities.VEHICLE);
  const eventPermission = findPermissionForEntity(Entities.EVENT);
  const rolePermission = findPermissionForEntity(Entities.ROLE);
  const attachmentsPermission = findPermissionForEntity(Entities.ATTACHMENT);
  return {
    userPermission,
    devicePermission,
    carPermission,
    attachmentsPermission,
    rolePermission,
    eventPermission,
  };
};
