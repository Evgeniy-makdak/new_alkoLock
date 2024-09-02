import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { usePasswordFormApi } from '../api/usePasswordFormApi';
import { schema } from '../lib/validate';
import { ChangePasswordData } from '@shared/types/BaseQueryTypes';

export const usePasswordForm = (close: () => void) => {
  const {
    register,
    handleSubmit,
    formState: {
      errors: { currentPassword, newPassword, confirmNewPassword },
    },
    control,
    setError,
  } = useForm<ChangePasswordData>({
    resolver: yupResolver(schema) as any,
  });

  const currentPasswordError = currentPassword ? currentPassword.message : '';
  const newPasswordError = newPassword ? newPassword.message : '';
  const confirmNewPasswordError = confirmNewPassword ? confirmNewPassword.message : '';

  const { changePassword } = usePasswordFormApi();

  const onSubmit = async (data: ChangePasswordData) => {
    if (data.newPassword.length <= 3) {
      setError('newPassword', {
        type: 'custom',
        message: ValidationMessages.notValidPasswordLength,
      });
      return;
    }
    if (data.currentPassword.length <= 3) {
      setError('currentPassword', {
        type: 'custom',
        message: ValidationMessages.notValidPasswordLength,
      });
      return;
    }

    if (data.newPassword !== data.confirmNewPassword) {
      setError('confirmNewPassword', {
        type: 'custom',
        message: ValidationMessages.passwordsMustMatch,
      });
      return;
    }

    const response = await changePassword(data);
    if (response.status === StatusCode.BAD_REQUEST) {
      setError('currentPassword', { type: 'custom', message: response.detail });
      return;
    }
    close();
  };

  return {
    currentPasswordError,
    newPasswordError,
    confirmNewPasswordError,
    register,
    handleSubmit: handleSubmit(onSubmit),
    control,
  };
};
