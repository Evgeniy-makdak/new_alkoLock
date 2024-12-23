import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { useChangePasswordApi } from '@pages/authorization/api/useChangePasswordApi';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { Form, schema } from '../lib/validateChange';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { enqueueSnackbar } from 'notistack';

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

    if (data.currentPassword === data.newPassword) {
      // enqueueSnackbar(ValidationMessages.passwordsMustMatch, { variant: 'error' });
      setError('newPassword', {
        type: 'custom',
        message: ValidationMessages.passwordsMustMatch,
      });
      return;
    }

    if (data.newPassword !== data.repeatNewPassword) {
      // enqueueSnackbar(ValidationMessages.passwordsMustMatch, { variant: 'error' });
      setError('repeatNewPassword', {
        type: 'custom',
        message: ValidationMessages.passwordsMustMatch,
      });
      return;
    }

    mutate(data, {
      onSuccess: (response) => {
        if (response?.status === StatusCode.SUCCESS) {
          enqueueSnackbar('Пароль успешно изменён', { variant: 'success' });
          navigate(RoutePaths.auth);
        } else {
          const errorMessage = response?.detail || ValidationMessages.defaultError;
          setError('currentPassword', {
            type: 'custom',
            message: errorMessage,
          });
          // enqueueSnackbar(errorMessage, { variant: 'error' });
        }
      },
      onError: (error) => {
        const errorMessage = (error as any)?.detail || ValidationMessages.defaultError;
        setError('currentPassword', {
          type: 'custom',
          message: errorMessage,
        });
        // enqueueSnackbar(errorMessage, { variant: 'error' });
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
