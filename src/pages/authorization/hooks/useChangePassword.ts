import { useForm } from 'react-hook-form';

import { usePasswordFormApi } from '@features/password_form/api/usePasswordFormApi';
// import { useLocation } from 'react-router-dom';
import { yupResolver } from '@hookform/resolvers/yup';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';

// import type { UserDataLogin } from '@shared/types/BaseQueryTypes';
import { Form, schema } from '../lib/validateChange';

export const useChangePassword = () => {
  // const { state } = useLocation(); // Переменная state для возможного использования в будущем

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { currentPassword, newPassword, repeatNewPassword },
    },
  } = useForm({
    resolver: yupResolver(schema),
  });

  // const handleAuthorization = (data: UserDataLogin) => {
  //   console.log(data);
  // };

  const isLoading = false;

  const errorCurrentPassword = currentPassword ? currentPassword.message : '';
  const errorNewPassword = newPassword ? newPassword.message : '';
  const errorRepeatNewPassword = repeatNewPassword ? repeatNewPassword.message : '';

  const { changePassword } = usePasswordFormApi();

  const onSubmit = async (data: Form) => {
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

    const response = await changePassword(data);
    if (response.status === StatusCode.BAD_REQUEST && data.currentPassword.length <= 3) {
      const messageStart =
        response?.detail.split(',')[6].indexOf('default message [') + 'default message ['.length;
      const messageEnd = response?.detail.split(',')[6].indexOf(']]');
      const correctResponse = response?.detail
        .split(',')[6]
        .substring(messageStart, messageEnd)
        .trim();
      setError('currentPassword', { type: 'custom', message: correctResponse });
      return;
    } else if (response.status === StatusCode.BAD_REQUEST) {
      setError('currentPassword', { type: 'custom', message: response.detail });
      return;
    }
    close();
  };

  return {
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorCurrentPassword,
    errorNewPassword,
    errorRepeatNewPassword,
    control,
  };
};
