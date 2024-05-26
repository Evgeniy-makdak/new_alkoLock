import { type FC } from 'react';

import { Typography } from '@mui/material';
import { InputPassword } from '@shared/ui/InputPassword/Input';

import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { Button, ButtonsType } from '@shared/ui/button';

import { usePasswordForm } from '../hooks/usePasswordForm';

type PasswordForm = {
  close: () => void;
};

export const PasswordForm: FC<PasswordForm> = ({ close }) => {
  const { currentPasswordError, handleSubmit, newPasswordError, register, control } = usePasswordForm(close);
  const isNotValidForm = !!currentPasswordError || !!newPasswordError;
  return (
    <>
      <Typography fontWeight={600} marginBottom={2}>
        Изменение пароля
      </Typography>
      <InputsColumnWrapper>
        <InputPassword
          error={!!currentPasswordError}
          {...register('currentPassword')}
          name="currentPassword"
          control={control}
          autoComplete="off"
          fullWidth
          type={'pass'}
          variant={'outlined'}
          label="Текущий пароль"
        />
        <InputPassword
          error={!!newPasswordError}
          {...register('newPassword')}
          name="newPassword"
          control={control}
          autoComplete="off"
          fullWidth
          type={'pass'}
          variant={'outlined'}
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
