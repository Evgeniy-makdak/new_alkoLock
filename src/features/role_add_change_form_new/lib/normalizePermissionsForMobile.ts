import { Entities } from '@shared/config/permissionsEnums';
import type { IUserGroupPermission } from '@shared/types/BaseQueryTypes';

export type NormalizePermissionsForMobile = {
  deletePermissions: string[];
  updatePermissions: string[];
  readPermissions: string[];
  createPermissions: string[];
};

export function normalizePermissionsForMobile(
  userGroupPermissions: IUserGroupPermission[],
): NormalizePermissionsForMobile {
  const rolePermissions: NormalizePermissionsForMobile = {
    deletePermissions: [],
    updatePermissions: [],
    readPermissions: [],
    createPermissions: [],
  };

  if (!userGroupPermissions?.length) return rolePermissions;

  const entityToNameMap: Record<string, string> = {
    [Entities.USER]: 'Пользователи',
    [Entities.VEHICLE]: 'Транспорт',
    [Entities.DEVICE]: 'Алкозамки',
    [Entities.EVENTS]: 'События',
    [Entities.ROLES]: 'Роли',
    [Entities.GROUP]: 'Группы',
    [Entities.SERVICE_MODE]: 'Сервисный режим',
    [Entities.HISTORY]: 'История сервисного режима',
    [Entities.BINDINGS]: 'Привязки',
    [Entities.SYSTEM_DRIVER_ACCOUNT]: 'Аккаунт водителя',
    [Entities.NOTIFICATIONS]: 'Рассылки',
    [Entities.OPERATOR_CHATS]: 'Чаты',
  };

  const specialPermissionsMap: Record<string, { entity: string; action: string }> = {
    PERMISSION_EVENTS_READ_ONLY_ROLE: { entity: Entities.EVENTS, action: 'READ' },
    SYSTEM_DRIVER_ACCOUNT: { entity: Entities.SYSTEM_DRIVER_ACCOUNT, action: 'READ' },
  };

  userGroupPermissions.forEach((permission) => {
    const permissionName = permission.permission.name;

    if (specialPermissionsMap[permissionName]) {
      const { entity, action } = specialPermissionsMap[permissionName];
      const name = entityToNameMap[entity];
      if (name) {
        if (action === 'READ') {
          rolePermissions.readPermissions.push(name);
        }
      }
      return;
    }

    if (permissionName.startsWith('PERMISSION_')) {
      const withoutPrefix = permissionName.substring('PERMISSION_'.length);
      const lastUnderscore = withoutPrefix.lastIndexOf('_');

      if (lastUnderscore !== -1) {
        const entity = withoutPrefix.substring(0, lastUnderscore);
        const action = withoutPrefix.substring(lastUnderscore + 1);
        const name = entityToNameMap[entity];

        if (name) {
          switch (action) {
            case 'CREATE':
              rolePermissions.createPermissions.push(name);
              break;
            case 'READ':
            case 'READ_ONLY_ROLE':
              rolePermissions.readPermissions.push(name);
              break;
            case 'EDIT':
              rolePermissions.updatePermissions.push(name);
              break;
            case 'DELETE':
              rolePermissions.deletePermissions.push(name);
              break;
          }
        }
      }
    }
  });

  const removeDuplicates = (arr: string[]) => {
    const result: string[] = [];
    arr.forEach((item) => {
      if (!result.includes(item)) {
        result.push(item);
      }
    });
    return result.sort();
  };

  return {
    deletePermissions: removeDuplicates(rolePermissions.deletePermissions),
    updatePermissions: removeDuplicates(rolePermissions.updatePermissions),
    readPermissions: removeDuplicates(rolePermissions.readPermissions),
    createPermissions: removeDuplicates(rolePermissions.createPermissions),
  };
}
