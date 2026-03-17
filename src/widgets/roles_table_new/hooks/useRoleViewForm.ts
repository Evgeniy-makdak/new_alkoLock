import { useEffect, useState } from 'react';

import { normalizePermissionsForMobile } from '@features/role_add_change_form_new/lib/normalizePermissionsForMobile';
import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

export const useRoleViewForm = (id: ID) => {
  const [roleName, setRoleName] = useState('');
  const [createPermissions, setCreatePermissions] = useState<string[]>([]);
  const [readPermissions, setReadPermissions] = useState<string[]>([]);
  const [updatePermissions, setUpdatePermissions] = useState<string[]>([]);
  const [deletePermissions, setDeletePermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { data: permissionFormat } = useConfiguredQuery(
    [QueryKeys.PERMISSION_FORMAT],
    RolesApi.getPermissionFormat,
    {
      settings: {},
      triggerOnBranchChange: false,
    },
  );

  const permissionOptions = {
    create: permissionFormat?.data ? [...Object.keys(permissionFormat.data.create)].sort() : [],
    read: permissionFormat?.data ? [...Object.keys(permissionFormat.data.read)].sort() : [],
    edit: permissionFormat?.data ? [...Object.keys(permissionFormat.data.edit)].sort() : [],
    delete: permissionFormat?.data ? [...Object.keys(permissionFormat.data.delete)].sort() : [],
  };

  useEffect(() => {
    const fetchRoleData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await RolesApi.getItem(id);
        const role = response.data;

        if (role) {
          setRoleName(role.name || '');

          // Используем специальную функцию для мобильной версии
          const permissionsNormalize = normalizePermissionsForMobile(
            role.userGroupPermissions || [],
          );

          setCreatePermissions(permissionsNormalize.createPermissions || []);
          setReadPermissions(permissionsNormalize.readPermissions || []);
          setUpdatePermissions(permissionsNormalize.updatePermissions || []);
          setDeletePermissions(permissionsNormalize.deletePermissions || []);
        } else {
          console.error('No role data received');
        }
      } catch (error) {
        console.error('Error fetching role data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoleData();
  }, [id]);

  return {
    isLoading,
    roleName,
    createPermissions,
    readPermissions,
    updatePermissions,
    deletePermissions,
    permissionOptions,
  };
};
