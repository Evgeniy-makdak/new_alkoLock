import { type FC } from 'react';
import { Typography } from '@mui/material';
import { InputsColumnWrapper } from '@shared/components/Inputs_column_wrapper/InputsColumnWrapper';
import { ButtonFormWrapper } from '@shared/components/button_form_wrapper/ButtonFormWrapper';
import { InputPassword } from '@shared/ui/InputPassword/Input';
import { Button, ButtonsType } from '@shared/ui/button';
import { usePasswordForm } from '../hooks/usePasswordForm';

type PasswordFormProps = {
  close: () => void;
};

export const PasswordForm: FC<PasswordFormProps> = ({ close }) => {
  const {
    currentPasswordError,
    newPasswordError,
    confirmNewPasswordError,
    handleSubmit,
    register,
    control,
  } = usePasswordForm(close);

  const isNotValidForm = !!currentPasswordError || !!newPasswordError || !!confirmNewPasswordError;

  return (
    <>
      <Typography fontWeight={600} marginBottom={2}>
        Изменение пароля
      </Typography>
      <InputsColumnWrapper>
        <InputPassword
          error={!!currentPasswordError}
          helperText={currentPasswordError || ' '}
          {...register('currentPassword')}
          name="currentPassword"
          control={control}
          autoComplete="off"
          fullWidth
          type="password"
          variant="outlined"
          label="Текущий пароль"
        />
        <InputPassword
          error={!!newPasswordError}
          helperText={newPasswordError || ' '}
          {...register('newPassword')}
          name="newPassword"
          control={control}
          autoComplete="off"
          fullWidth
          type="password"
          variant="outlined"
          label="Новый пароль"
        />
        <InputPassword
          error={!!confirmNewPasswordError}
          helperText={confirmNewPasswordError || ' '}
          {...register('confirmNewPassword')}
          name="confirmNewPassword"
          control={control}
          autoComplete="off"
          fullWidth
          type="password"
          variant="outlined"
          label="Подтвердите пароль"
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
