import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { TextField, Typography } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useRoleAddChangeForm_new } from '../hooks/useRoleAddChangeForm_new';
import { MultiSelectWithChips } from '../lib/MultiSelectWithChips';

interface RoleAddChangeFormProps {
  closeModal: () => void;
  id?: ID;
}

export const RoleAddChangeForm_new: FC<RoleAddChangeFormProps> = ({ closeModal, id }) => {
  const { t } = useTranslation();
  const {
    isLoading,
    handleSubmit,
    register,
    errorName,
    createPermissions = [],
    readPermissions = [],
    updatePermissions = [],
    deletePermissions = [],
    setCreatePermissions,
    setReadPermissions,
    setUpdatePermissions,
    setDeletePermissions,
    permissionOptions,
    isDirty,
  } = useRoleAddChangeForm_new(id, closeModal);

  // Обработчик потери фокуса с обрезкой пробелов
  const handleBlurWithTrim = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim().replace(/\s+/g, ' ');
    if (trimmedValue !== e.target.value) {
      // Создаем синтетическое событие с обрезанным значением
      const syntheticEvent = {
        target: {
          value: trimmedValue,
          name: e.target.name,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      // Вызываем обработчик react-hook-form
      register('name').onChange(syntheticEvent);
    }
  };

  return (
    <Loader isLoading={isLoading}>
      <form onSubmit={handleSubmit}>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          {id ? t('modals.editRole') : t('modals.addRole')}
        </Typography>
        {isLoading ? null : (
          <>
            <InputsColumnWrapper>
              <TextField
                data-testid={testids.page_roles.roles_popup_add_role.ROLES_ADD_ROLE_NAME}
                helperText={<span>{errorName}</span>}
                error={!!errorName}
                {...register('name')}
                label={t('form.roleName')}
                onBlur={handleBlurWithTrim}
              />

              <MultiSelectWithChips
                value={createPermissions}
                onChange={setCreatePermissions}
                label={t('form.createRights')}
                options={permissionOptions.create}
                disabledOptions={[]}
              />

              <MultiSelectWithChips
                value={readPermissions}
                onChange={setReadPermissions}
                label={t('form.readRights')}
                options={permissionOptions.read}
                disabledOptions={[]}
              />

              <MultiSelectWithChips
                value={updatePermissions}
                onChange={setUpdatePermissions}
                label={t('form.modifyRights')}
                options={permissionOptions.edit}
                disabledOptions={[]}
              />

              <MultiSelectWithChips
                value={deletePermissions}
                onChange={setDeletePermissions}
                label={t('form.deleteRights')}
                options={permissionOptions.delete}
                disabledOptions={[]}
              />
            </InputsColumnWrapper>
            <ButtonFormWrapper>
              <Button testid={testids.POPUP_ACTION_BUTTON} type="submit" disabled={!isDirty}>
                {id ? t('common.save') : t('common.add')}
              </Button>
              <Button testid={testids.POPUP_CANCEL_BUTTON} onClick={closeModal}>
                {t('common.cancel')}
              </Button>
            </ButtonFormWrapper>
          </>
        )}
      </form>
    </Loader>
  );
};
