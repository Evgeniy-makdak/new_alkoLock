import { Permissions } from '@shared/config/permissionsEnums';
import type { IRole, IUser } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';

export const groupsMapper = (
  user: IUser | null,
  groups: IRole[] | null,
): { values: Values; isGlobalAdmin: boolean; isUserDriver: boolean; } => {
  let isGlobalAdmin = false;
  let isUserDriver = false;
  if (!user || !groups) return { values: [], isGlobalAdmin, isUserDriver };

  // TODO => убрать мэтчинг двух списков когда бэк начнет возвращать в user permissions
  const values = user.groupMembership.map((item) => {
    const permissions: Permissions[] = [];
    const role = groups?.find((group) => group.id === item?.group?.id);

    if (role?.userGroupPermissions) {
      role.userGroupPermissions.map((group) => {
        if (group?.permission?.name) {
          isGlobalAdmin = !isGlobalAdmin
            ? group?.permission?.name === Permissions.SYSTEM_GLOBAL_ADMIN
            : isGlobalAdmin;
        }
        if (group?.permission?.name === Permissions.SYSTEM_DRIVER_ACCOUNT) {
          isUserDriver = true;
        }
        permissions.push(group.permission.name);
      });
    }
    return { value: item?.group?.id, label: item?.group?.name, permissions: permissions };
  });
  return { values, isGlobalAdmin, isUserDriver };
};
