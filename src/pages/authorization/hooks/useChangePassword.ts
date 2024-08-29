import { useForm } from 'react-hook-form';
// import { useLocation } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import type { UserDataLogin } from '@shared/types/BaseQueryTypes';
import { schema } from '../lib/validateChange';

export const useChangePassword = () => {
  // const { state } = useLocation(); // Переменная state для возможного использования в будущем

  const {
    handleSubmit,
    register,
    control,
    formState: {
      errors: { currentPassword, newPassword, repeatNewPassword },
    },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const handleAuthorization = (data: UserDataLogin) => {
    console.log(data);
  };

  const isLoading = false;

  const errorCurrentPassword = currentPassword ? currentPassword.message : '';
  const errorNewPassword = newPassword ? newPassword.message : '';
  const errorRepeatNewPassword = repeatNewPassword ? repeatNewPassword.message : '';

  return {
    handleSubmit: handleSubmit(handleAuthorization),
    isLoading,
    register,
    errorCurrentPassword,
    errorNewPassword,
    errorRepeatNewPassword,
    control,
  };
};
