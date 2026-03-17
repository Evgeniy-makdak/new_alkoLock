import type { FC } from 'react';

import { TextField, Typography } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import type { ID } from '@shared/types/BaseQueryTypes';
import { Button } from '@shared/ui/button';
import { Loader } from '@shared/ui/loader';

import { useRoleViewForm } from '../hooks/useRoleViewForm';
import { MultiSelectWithChipsView } from '../lib/MultiSelectWithChipsView';

interface RoleViewFormProps {
  closeModal: () => void;
  id: ID;
}

export const RoleViewForm: FC<RoleViewFormProps> = ({ closeModal, id }) => {
  const {
    isLoading,
    roleName,
    createPermissions = [],
    readPermissions = [],
    updatePermissions = [],
    deletePermissions = [],
    permissionOptions,
  } = useRoleViewForm(id);

  return (
    <Loader isLoading={isLoading}>
      <form>
        <Typography fontWeight={600} marginBottom={2} variant="h6">
          Просмотр роли
        </Typography>
        {isLoading ? (
          <Typography>Загрузка данных...</Typography>
        ) : (
          <>
            <InputsColumnWrapper>
              <TextField
                value={roleName || 'Нет названия'}
                label="Название роли"
                InputProps={{
                  readOnly: true,
                }}
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: '#000000',
                  },
                }}
              />

              <MultiSelectWithChipsView
                value={createPermissions}
                label="Права на создание"
                options={permissionOptions.create}
              />

              <MultiSelectWithChipsView
                value={readPermissions}
                label="Права на чтение"
                options={permissionOptions.read}
              />

              <MultiSelectWithChipsView
                value={updatePermissions}
                label="Права на изменение"
                options={permissionOptions.edit}
              />

              <MultiSelectWithChipsView
                value={deletePermissions}
                label="Права на удаление"
                options={permissionOptions.delete}
              />
            </InputsColumnWrapper>
            <ButtonFormWrapper>
              <Button onClick={closeModal}>закрыть</Button>
            </ButtonFormWrapper>
          </>
        )}
      </form>
    </Loader>
  );
};
