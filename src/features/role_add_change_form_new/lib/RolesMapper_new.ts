import { Entities, type Permissions } from '@shared/config/permissionsEnums';
import type { CreateRoleData, IRole } from '@shared/types/BaseQueryTypes';

import type { NormalizePermissions_new } from './normalizePermissions_new';
import { normalizePermissions_new } from './normalizePermissions_new';
import type { Form } from './validate';

export class RolesMapper_new {
  private static readonly ENTITY_TO_NAME_MAP: Record<string, string> = {
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

  static toApi(data: Form): CreateRoleData {
    const permissions: Permissions[] = [];

    const addPermission = (entity: string, action: string) => {
      const permission = `PERMISSION_${entity}_${action}` as Permissions;
      if (!permissions.includes(permission)) {
        permissions.push(permission);
      }
    };

    const processPermissions = (names: string[], actions: string[]) => {
      names?.forEach((name) => {
        const entity = Object.entries(this.ENTITY_TO_NAME_MAP).find(
          ([, value]) => value === name,
        )?.[0];
        if (entity) {
          actions.forEach((action) => addPermission(entity, action));
        }
      });
    };

    processPermissions(data.createPermissions, ['CREATE', 'READ']);
    processPermissions(data.readPermissions, ['READ']);
    processPermissions(data.updatePermissions, ['EDIT', 'READ']);
    processPermissions(data.deletePermissions, ['DELETE', 'READ']);

    return {
      name: data.name,
      permissions,
    };
  }

  static fromApi(data: IRole) {
    return {
      role: data.name,
      ...normalizePermissions_new(data.userGroupPermissions),
    };
  }

  static getPermissionForForm(data: NormalizePermissions_new) {
    return {
      createPermissions: [...(data.createPermissions || [])].sort(),
      readPermissions: [...(data.readPermissions || [])].sort(),
      updatePermissions: [...(data.updatePermissions || [])].sort(),
      deletePermissions: [...(data.deletePermissions || [])].sort(),
    };
  }

  private static getNameToEntity(name: string): string | null {
    return Object.entries(this.ENTITY_TO_NAME_MAP).find(([, value]) => value === name)?.[0] || null;
  }
}
