/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { RolesMapper_new } from '@features/role_add_change_form_new/lib/RolesMapper_new';
import { type IRole } from '@shared/types/BaseQueryTypes';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IRole[]): GridRowsProp => {
  const mapData = (data ? data : []).map((role) => {
    const permissions = RolesMapper_new.fromApi(role);

    return {
      id: role.id,
      disabledAction: role?.systemGenerated,
      [ValuesHeader.ROLE]: role.name,
      [ValuesHeader.CREATE_PERMISSIONS]: permissions.createPermissions,
      [ValuesHeader.READ_PERMISSIONS]: permissions.readPermissions,
      [ValuesHeader.UPDATE_PERMISSIONS]: permissions.updatePermissions,
      [ValuesHeader.DELETE_PERMISSIONS]: permissions.deletePermissions,
    };
  });

  return useMemo(() => mapData, [data]);
};
