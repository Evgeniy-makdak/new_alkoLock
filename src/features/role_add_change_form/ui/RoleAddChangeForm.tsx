/* eslint-disable @typescript-eslint/no-unused-vars */
import type { FC } from 'react';

import { TextField, Typography } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { FieldSelect } from '@shared/ui/field_select';
import { Loader } from '@shared/ui/loader';

import { TypesOfForm, useRoleAddChangeForm } from '../hooks/useRoleAddChangeForm';

interface RoleAddChangeFormProps {
  closeModal: () => void;
  id?: ID;
}

export const RoleAddChangeForm: FC<RoleAddChangeFormProps> = ({ closeModal, id }) => {
  const {
    isLoading,
    handleSubmit,
    register,
    errorName,
    permissions,
    alkolockPermission,
    attachPermission,
    carsPermission,
    usersPermission,
    onChangePermissions,
  } = useRoleAddChangeForm(id, closeModal);
  return (
    <Loader isLoading={isLoading}>
      <form onSubmit={handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? 'Редактирование роли' : 'Добавление роли'}
        </Typography>
        {isLoading ? null : (
          <>
            <InputsColumnWrapper>
              <TextField
                data-testid={testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_NAME}
                helperText={<span>{errorName}</span>}
                error={!!errorName}
                {...register('name')}
                label={'Название роли'}
              />
              <FieldSelect
                testId={testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_USERS_PERMISSIONS}
                onChange={(value) => onChangePermissions(TypesOfForm.usersPermission, value)}
                selectProps={{
                  value: usersPermission,
                }}
                labelText="Пользователи"
                options={permissions}
              />
              <FieldSelect
                testId={testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_CAR_PERMISSIONS}
                onChange={(value) => onChangePermissions(TypesOfForm.carsPermission, value)}
                selectProps={{
                  value: carsPermission,
                }}
                labelText="ТС"
                options={permissions}
              />
              <FieldSelect
                testId={testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_ALCOLOCK_PERMISSIONS}
                onChange={(value) => onChangePermissions(TypesOfForm.alkolockPermission, value)}
                selectProps={{
                  value: alkolockPermission,
                }}
                labelText="Алкозамки"
                options={permissions}
              />
              <FieldSelect
                testId={
                  testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_ATTACHMENTS_PERMISSIONS
                }
                labelText="Привязки"
                selectProps={{
                  value: attachPermission,
                  disabled: true,
                }}
                options={permissions}
              />
            </InputsColumnWrapper>
            <ButtonFormWrapper>
              <Button testid={testids.POPUP_ACTION_BUTTON} type="submit">
                {id ? 'сохранить' : 'добавить'}
              </Button>
              <Button testid={testids.POPUP_CANCEL_BUTTON} onClick={closeModal}>
                отмена
              </Button>
            </ButtonFormWrapper>
          </>
        )}
      </form>
    </Loader>
  );
};
