import { AppConstants } from '@app/index';
import { Entities, type Permissions } from '@shared/config/permissionsEnums';
import type { CreateRoleData, IRole } from '@shared/types/BaseQueryTypes';

import type { NormalizePermissions } from './normalizePermissions';
import { normalizePermissions } from './normalizePermissions';
import type { Form } from './validate';

// TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
export class RolesMapper {
  static toApi(data: Form): CreateRoleData {
    const userPermissions = this.getPermissions(Entities.USER, Number(data.usersPermission));
    const devicesPermissions = this.getPermissions(
      Entities.DEVICE,
      Number(data.alkolockPermission),
    );
    const carPermissions = this.getPermissions(Entities.VEHICLE, Number(data.carsPermission));

    return {
      name: data.name,
      permissions: [...userPermissions, ...devicesPermissions, ...carPermissions],
    };
  }

  static fromApi(data: IRole) {
    const rolesPermissions = normalizePermissions(data.userGroupPermissions);

    return {
      role: data.name,
      ...rolesPermissions,
    };
  }

  static getPermissions(entity: Entities, value: number): Permissions[] {
    const result: Permissions[] = [];

    if (value === 1) {
      result.push(`PERMISSION_${entity}_CREATE` as Permissions);
    } else if (value === 2) {
      result.push(`PERMISSION_${entity}_READ` as Permissions);
    }

    return result;
  }

  static getPermissionForForm(data: NormalizePermissions) {
    const permissionsUser = AppConstants.permissionsList.find(
      (perm) => perm.value === data.user_control,
    );
    const permissionsTC = AppConstants.permissionsList.find(
      (perm) => perm.value === data.car_control,
    );

    const permissionsAlkolocks = AppConstants.permissionsList.find(
      (perm) => perm.value === data.alkozamki_control,
    );
    const permissionsAttachments = AppConstants.permissionsList.find(
      (perm) => perm.value === data.attachments_control,
    );
    return { permissionsUser, permissionsTC, permissionsAlkolocks, permissionsAttachments };
  }
}
