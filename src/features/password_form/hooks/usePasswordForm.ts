import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';

import { usePasswordFormApi } from '../api/usePasswordFormApi';
import { Form, schema } from '../lib/validate';

export const usePasswordForm = (close: () => void) => {
  const {
    register,
    handleSubmit,
    formState: {
      errors: { currentPassword, newPassword },
    },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const currentPasswordError = currentPassword ? currentPassword?.message : '';
  const newPasswordError = newPassword ? newPassword?.message : '';

  const { changePassword } = usePasswordFormApi();

  const onSubmit = async (data: Form) => {
    await changePassword(data);
    close();
  };

  return { currentPasswordError, newPasswordError, register, handleSubmit: handleSubmit(onSubmit) };
};
