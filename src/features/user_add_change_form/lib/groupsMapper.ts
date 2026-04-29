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
  if (!user || !groups) return { values: [], isGlobalAdmin, isUserDriver, isReadOnly };

  // TODO => убрать мэтчинг двух списков когда бэк начнет возвращать в user permissions
  const values = user.groupMembership.reduce((acc: Values, item) => {
    const permissions: Permissions[] = [];
    const role = groups?.find((group) => group.id === item?.group?.id);

    // Если роль отсутствует в актуальном списке групп (например, удалена),
    // не добавляем её в дефолтное значение формы, чтобы исключить flicker при открытии карточки.
    if (!role) return acc;

    if (role?.userGroupPermissions) {
      role.userGroupPermissions.map((group) => {
        if (group?.permission?.name) {
          isGlobalAdmin = !isGlobalAdmin
            ? group?.permission?.name === Permissions.SYSTEM_GLOBAL_ADMIN
            : isGlobalAdmin;
        }
        if (group?.permission?.name === Permissions.PERMISSION_EVENTS_READ) {
          isReadOnly = true;
        }
        if (group?.permission?.name === Permissions.PERMISSION_VEHICLE_READ) {
          isReadOnly = true;
        }
        if (group?.permission?.name === Permissions.PERMISSION_DEVICE_READ) {
          isReadOnly = true;
        }
        if (group?.permission?.name === Permissions.PERMISSION_USER_READ) {
          isReadOnly = true;
        }
        if (group?.permission?.name === Permissions.SYSTEM_DRIVER_ACCOUNT) {
          isUserDriver = true;
        }
        permissions.push(group.permission.name);
      });
    }
    acc.push({ value: item?.group?.id, label: item?.group?.name, permissions });
    return acc;
  }, []);
  return { values, isGlobalAdmin, isUserDriver, isReadOnly };
};
