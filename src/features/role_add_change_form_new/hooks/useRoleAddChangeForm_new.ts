/* eslint-disable no-console */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';
import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useRoleAddChangeFormApi } from '../api/useRoleAddChangeFormApi_new';
import { RolesMapper_new } from '../lib/RolesMapper_new';
import { normalizePermissions_new } from '../lib/normalizePermissions_new';
import { type Form, schema } from '../lib/validate';

interface CloseContextType {
  close: () => void;
}

const CloseContext = createContext<CloseContextType | null>(null);

export const useCloseContext = (): CloseContextType => {
  const context = useContext(CloseContext);
  if (!context) {
    throw new Error('useCloseContext must be used within a CloseContextProvider');
  }
  return context;
};

export const useRoleAddChangeForm_new = (id: ID, close: () => void) => {
  const { role, isLoading, changeRole, createRole } = useRoleAddChangeFormApi(id);
  const [defaultValuesLoaded, setDefaultValuesLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<Form>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      createPermissions: [],
      readPermissions: [],
      updatePermissions: [],
      deletePermissions: [],
    },
  });

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
    if (!isLoading && role && !defaultValuesLoaded) {
      const permissionsNormalize = normalizePermissions_new(role.userGroupPermissions);
      const permissionsForForm = RolesMapper_new.getPermissionForForm(permissionsNormalize);

      reset({
        name: role.name || '',
        createPermissions: permissionsForForm.createPermissions || [],
        readPermissions: permissionsForForm.readPermissions || [],
        updatePermissions: permissionsForForm.updatePermissions || [],
        deletePermissions: permissionsForForm.deletePermissions || [],
      });
      setDefaultValuesLoaded(true);
    }
  }, [role, isLoading, reset, defaultValuesLoaded]);

  useEffect(() => {
    setDefaultValuesLoaded(false);
  }, [id]);

  const errorName = errors.name?.message?.toString() || '';
  const currentValues = watch();

  const CHAT_ENTITY = 'Чаты';

  const syncReadPermissions = useCallback(
    (permissions: string[]) => {
      const currentRead = currentValues.readPermissions;
      const toAdd = permissions.filter((p) => !currentRead.includes(p));
      if (toAdd.length > 0) {
        setValue('readPermissions', [...currentRead, ...toAdd].sort());
      }
    },
    [currentValues.readPermissions, setValue],
  );

  const handleCreatePermissionsChange = useCallback(
    (newCreatePermissions: string[]) => {
      const hasChatInCreate = newCreatePermissions.includes(CHAT_ENTITY);
      const currentUpdate = currentValues.updatePermissions;
      const hasChatInUpdate = currentUpdate.includes(CHAT_ENTITY);

      setValue('createPermissions', [...newCreatePermissions].sort());
      syncReadPermissions(newCreatePermissions);

      if (hasChatInCreate && !hasChatInUpdate) {
        setValue('updatePermissions', [...currentUpdate, CHAT_ENTITY].sort());
      } else if (!hasChatInCreate && hasChatInUpdate) {
        setValue('updatePermissions', currentUpdate.filter((p) => p !== CHAT_ENTITY).sort());
      }
    },
    [currentValues.updatePermissions, setValue, syncReadPermissions],
  );

  const handleUpdatePermissionsChange = useCallback(
    (newUpdatePermissions: string[]) => {
      const hasChatInUpdate = newUpdatePermissions.includes(CHAT_ENTITY);
      const currentCreate = currentValues.createPermissions;
      const hasChatInCreate = currentCreate.includes(CHAT_ENTITY);

      setValue('updatePermissions', [...newUpdatePermissions].sort());
      syncReadPermissions(newUpdatePermissions);

      if (hasChatInUpdate && !hasChatInCreate) {
        setValue('createPermissions', [...currentCreate, CHAT_ENTITY].sort());
      } else if (!hasChatInUpdate && hasChatInCreate) {
        setValue('createPermissions', currentCreate.filter((p) => p !== CHAT_ENTITY).sort());
      }
    },
    [currentValues.createPermissions, setValue, syncReadPermissions],
  );

  const handleReadPermissionsChange = useCallback(
    (newReadPermissions: string[]) => {
      const removedPermissions = currentValues.readPermissions.filter(
        (p) => !newReadPermissions.includes(p),
      );

      if (removedPermissions.length > 0) {
        setValue(
          'createPermissions',
          currentValues.createPermissions.filter((p) => !removedPermissions.includes(p)).sort(),
        );
        setValue(
          'updatePermissions',
          currentValues.updatePermissions.filter((p) => !removedPermissions.includes(p)).sort(),
        );
        setValue(
          'deletePermissions',
          currentValues.deletePermissions.filter((p) => !removedPermissions.includes(p)).sort(),
        );
      }

      setValue('readPermissions', [...newReadPermissions].sort());
    },
    [currentValues, setValue],
  );

  const onSubmit = async (data: Form) => {
    // 🔧 FIX: Убираем обрезку данных здесь - она должна происходить в валидации
    // const trimmedData: Form = {
    //   name: data.name.trim(),
    //   createPermissions: data.createPermissions,
    //   readPermissions: data.readPermissions,
    //   updatePermissions: data.updatePermissions,
    //   deletePermissions: data.deletePermissions,
    // };

    try {
      // 🔧 FIX: Используем исходные данные без обрезки
      const payload = RolesMapper_new.toApi(data);
      id ? await changeRole({ data: payload, id }) : await createRole(payload);
      close();
    } catch (error) {
      console.error('Ошибка при сохранении роли:', error);
    }
  };

  return {
    errorName,
    register,
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    createPermissions: currentValues.createPermissions,
    readPermissions: currentValues.readPermissions,
    updatePermissions: currentValues.updatePermissions,
    deletePermissions: currentValues.deletePermissions,
    setCreatePermissions: handleCreatePermissionsChange,
    setReadPermissions: handleReadPermissionsChange,
    setUpdatePermissions: handleUpdatePermissionsChange,
    setDeletePermissions: (permissions: string[]) => {
      setValue('deletePermissions', [...permissions].sort());
      syncReadPermissions(permissions);
    },
    permissionOptions,
  };
};
