import { useForm } from 'react-hook-form';

import { yupResolver } from '@hookform/resolvers/yup';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';

import { usePasswordFormApi } from '../api/usePasswordFormApi';
import { Form, schema } from '../lib/validate';

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
    currentPasswordError,
    newPasswordError,
    register,
    handleSubmit: handleSubmit(onSubmit),
    control,
  };
};
