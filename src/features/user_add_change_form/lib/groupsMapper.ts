import { Permissions } from '@shared/config/permissionsEnums';
import type { IRole, IUser } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';

export const groupsMapper = (
  user: IUser | null,
  groups: IRole[] | null,
): { values: Values; isGlobalAdmin: boolean; isUserDriver: boolean; isReadOnly: boolean } => {
  let isGlobalAdmin = false;
  let isUserDriver = false;
  let isReadOnly = false;
  if (!user) return { values: [], isGlobalAdmin, isUserDriver, isReadOnly };

  // TODO => убрать мэтчинг двух списков когда бэк начнет возвращать в user permissions
  const values = user.groupMembership.reduce((acc: Values, item) => {
    const group = item?.group as any;
    const groupId = group?.id;
    const groupName = group?.name;
    if (groupId == null || groupName == null || groupName === '') return acc;

    const permissions: Permissions[] = [];

    // 1) Предпочитаем права, если они уже пришли в response api/users/{id} (group.userGroupPermissions).
    const userGroupPermissions = Array.isArray(group?.userGroupPermissions)
      ? group.userGroupPermissions
      : null;

    // 2) fallback: если groups (api/user-groups) загружен — забираем permissions из роли.
    const role =
      !userGroupPermissions && groups ? groups?.find((g) => g?.id === groupId) : undefined;

    const sourcePermissions =
      userGroupPermissions ?? (role?.userGroupPermissions ? role.userGroupPermissions : null);

    if (sourcePermissions) {
      sourcePermissions.forEach((p: any) => {
        const permName = p?.permission?.name as Permissions | undefined;
        if (!permName) return;

        isGlobalAdmin =
          !isGlobalAdmin ? permName === Permissions.SYSTEM_GLOBAL_ADMIN : isGlobalAdmin;

        if (
          permName === Permissions.PERMISSION_EVENTS_READ ||
          permName === Permissions.PERMISSION_VEHICLE_READ ||
          permName === Permissions.PERMISSION_DEVICE_READ ||
          permName === Permissions.PERMISSION_USER_READ
        ) {
          isReadOnly = true;
        }

        if (permName === Permissions.SYSTEM_DRIVER_ACCOUNT) {
          isUserDriver = true;
        }

        permissions.push(permName);
      });
    }

    acc.push({ value: groupId, label: groupName, permissions });
    return acc;
  }, []);
  return { values, isGlobalAdmin, isUserDriver, isReadOnly };
};
