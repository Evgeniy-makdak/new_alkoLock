import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { useForgetPasswordApi } from '@pages/authorization/api/useForgetPassworApi';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { Form, schema } from '../lib/validateForget';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { enqueueSnackbar } from 'notistack';

export const useForgetPassword = () => {
  const navigate = useNavigate();

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { newPassword, repeatNewPassword },
    },
  } = useForm<Form>({
    resolver: yupResolver(schema),
  });

  const { mutate, isLoading } = useForgetPasswordApi();

  const onSubmit = async (data: Form) => {
    if (data.newPassword.length <= 3) {
      setError('newPassword', {
        type: 'custom',
        message: ValidationMessages.notValidPasswordLength,
      });
      return;
    }

    if (data.newPassword !== data.repeatNewPassword) {
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
          setError('newPassword', {
            type: 'custom',
            message: errorMessage,
          });
        }
      },
      onError: (error) => {
        const errorMessage = (error as any)?.detail || ValidationMessages.defaultError;
        setError('newPassword', {
          type: 'custom',
          message: errorMessage,
        });
      },
    });
  };

  return {
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorNewPassword: newPassword?.message || '',
    errorRepeatNewPassword: repeatNewPassword?.message || '',
    control,
  };
};
