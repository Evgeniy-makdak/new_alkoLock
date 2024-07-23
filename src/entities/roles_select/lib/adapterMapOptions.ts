import { Permissions } from '@shared/config/permissionsEnums';
import type { IPermissions, IRole } from '@shared/types/BaseQueryTypes';
import type { AdapterReturn } from '@shared/ui/search_multiple_select';

export const adapterMapOptions = (val: IRole, notShowGlobalAdminRole = true): AdapterReturn => {
  const permissions: IPermissions = val?.userGroupPermissions.map((item) => item.permission.name);
  const isGlobalAdminRole = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
  if (notShowGlobalAdminRole && isGlobalAdminRole) return [];
  return [`${val?.name}`, val.id, permissions];
};
