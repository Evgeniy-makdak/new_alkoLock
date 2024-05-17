/* eslint-disable @typescript-eslint/no-unused-vars */
import { useForm } from 'react-hook-form';

import { AppConstants } from '@app/index';
import { yupResolver } from '@hookform/resolvers/yup';
import type { ID } from '@shared/types/BaseQueryTypes';

import { useRoleAddChangeFormApi } from '../api/useRoleAddChangeFormApi';
import { RolesMapper } from '../lib/RolesMapper';
import { normalizePermissions } from '../lib/normalizePermissions';
import { type Form, schema } from '../lib/validate';

export enum TypesOfForm {
  alkolockPermission = 'alkolockPermission',
  attachPermission = 'attachPermission',
  carsPermission = 'carsPermission',
  usersPermission = 'usersPermission',
}

export const useRoleAddChangeForm = (id: ID, close: () => void) => {
  const { role, isLoading, changeRole, createRole } = useRoleAddChangeFormApi(id);
  const permissions = AppConstants.permissionsList;
  const permissionsNormalize = normalizePermissions(role?.userGroupPermissions);
  const permissionsForForm = RolesMapper.getPermissionForForm(permissionsNormalize);
  const usersPermission = permissionsForForm.permissionsUser.value;
  const carsPermission = permissionsForForm.permissionsTC.value;
  const alkolockPermission = permissionsForForm.permissionsAlkolocks.value;
  const attachPermission = permissionsForForm.permissionsAttachments.value;
  const defaultValues: Form = {
    name: role?.name || '',
    alkolockPermission,
    attachPermission,
    carsPermission,
    usersPermission,
  };

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    watch,
    formState: {
      errors: { name },
    },
  } = useForm({
    resolver: yupResolver(schema),
    values: defaultValues,
  });
  const onChangePermissions = (type: TypesOfForm, value: ID) => {
    const values = getValues();
    const usersPermission = type === TypesOfForm.usersPermission ? value : values.usersPermission;
    const carsPermission = type === TypesOfForm.carsPermission ? value : values.carsPermission;

    setValue(
      TypesOfForm.attachPermission,
      Math.max(Number(usersPermission), Number(carsPermission)),
    );

    setValue(type, value);
  };

  const errorName = name ? name.message.toString() : '';

  const onSubmit = async (data: Form) => {
    const payload = RolesMapper.toApi(data);

    id ? await changeRole({ data: payload, id }) : await createRole(payload);
    close();
  };

  return {
    errorName,
    register,
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    permissions,
    alkolockPermission: watch('alkolockPermission'),
    attachPermission: watch('attachPermission'),
    carsPermission: watch('carsPermission'),
    usersPermission: watch('usersPermission'),
    onChangePermissions,
  };
};
