import { type FC } from 'react';

import { TextField, Typography } from '@mui/material';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { Button, ButtonsType } from '@shared/ui/button';

import { usePasswordForm } from '../hooks/usePasswordForm';

type PasswordForm = {
  close: () => void;
};

export const PasswordForm: FC<PasswordForm> = ({ close }) => {
  const { currentPasswordError, handleSubmit, newPasswordError, register } = usePasswordForm(close);
  const isNotValidForm = !!currentPasswordError || !!newPasswordError;
  return (
    <>
      <Typography fontWeight={600} marginBottom={2}>
        Изменение пароля
      </Typography>
      <InputsColumnWrapper>
        <TextField
          {...register('currentPassword')}
          error={!!currentPasswordError}
          helperText={currentPasswordError}
          label="Текущий пароль"
        />
        <TextField
          {...register('newPassword')}
          error={!!newPasswordError}
          helperText={newPasswordError}
          label="Новый пароль"
        />
      </InputsColumnWrapper>
      <ButtonFormWrapper>
        <Button typeButton={ButtonsType.action} disabled={isNotValidForm} onClick={handleSubmit}>
          Сохранить
        </Button>
        <Button typeButton={ButtonsType.action} onClick={close}>
          Отменить
        </Button>
      </ButtonFormWrapper>
    </>
  );
};
