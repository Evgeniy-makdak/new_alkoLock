import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';

import { usePasswordFormApi } from '../api/usePasswordFormApi';
import { Form, schema } from '../lib/validate';

import { StatusCode } from '@shared/const/statusCode';

export const usePasswordForm = (close: () => void) => {
  const {
    register,
    handleSubmit,
    formState: {
      errors: { currentPassword, newPassword },
    },
    control,
    setError,
  } = useForm({
    resolver: yupResolver(schema),
  });

  const currentPasswordError = currentPassword ? currentPassword?.message : '';
  const newPasswordError = newPassword ? newPassword?.message : '';

  const { changePassword } = usePasswordFormApi();

  const onSubmit = async (data: Form) => {
    const response = await changePassword(data);
    if (response.status === StatusCode.BAD_REQUEST) {
      setError('currentPassword', { type: 'custom', message: response.detail });
      // setError('newPassword', { type: 'custom', message: response.detail });
      return;
    }
    close();
  };

  return {
    currentPasswordError,
    newPasswordError,
    register,
    handleSubmit: handleSubmit(onSubmit),
    control,
  };
};
