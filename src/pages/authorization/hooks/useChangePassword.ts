import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';

import { useChangePasswordApi } from '@pages/authorization/api/useChangePasswordApi';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { Form, schema } from '../lib/validateChange';
import { RoutePaths } from '@shared/config/routePathsEnum';

export const useChangePassword = () => {
  const navigate = useNavigate();

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { currentPassword, newPassword, repeatNewPassword },
    },
  } = useForm<Form>({
    resolver: yupResolver(schema),
  });

  const { mutate, isLoading } = useChangePasswordApi();

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

    mutate(data, {
      onError: (error) => {
        // Преобразуем ошибку к нужному типу
        if (error instanceof Error) {
          if ((error as any).status === StatusCode.BAD_REQUEST) {
            setError('currentPassword', {
              type: 'custom',
              message: (error as any).detail || ValidationMessages.defaultError,
            });
          }
        }
      },
      onSuccess: () => {
        navigate(RoutePaths.auth);
      },
    });
  };

  return {
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorCurrentPassword: currentPassword?.message || '',
    errorNewPassword: newPassword?.message || '',
    errorRepeatNewPassword: repeatNewPassword?.message || '',
    control,
  };
};
