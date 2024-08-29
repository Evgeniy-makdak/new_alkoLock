import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { RolesMapper, normalizePermissions } from '@features/role_add_change_form';
import { type IRole } from '@shared/types/BaseQueryTypes';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IRole[]): GridRowsProp => {
  const mapData = (data ? data : []).map((role) => {
    const rolePermissions = normalizePermissions(role.userGroupPermissions);
    const { permissionsAlkolocks, permissionsAttachments, permissionsTC, permissionsUser } =
      RolesMapper.getPermissionForForm(rolePermissions);
    return {
      id: role.id,
      disabledAction: role?.systemGenerated,
      [ValuesHeader.ROLE]: role.name,
      [ValuesHeader.USER_MANAGEMENT]: permissionsUser?.label,
      [ValuesHeader.TC_MANAGEMENT]: permissionsTC?.label,
      [ValuesHeader.ALKOLOCK_MANAGEMENT]: permissionsAlkolocks?.label,
      [ValuesHeader.ATTACHMENT_MANAGEMENTS]: permissionsAttachments?.label,
    };
  });

  const returnData = useMemo(() => mapData, [data]);
  return returnData;
};
