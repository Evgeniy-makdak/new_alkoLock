import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate } from 'react-router-dom';
import { useResetPasswordApi } from '@pages/authorization/api/useResetPassworApi';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';
import { Form, schema } from '../lib/validate'; 
import { RoutePaths } from '@shared/config/routePathsEnum';
import { enqueueSnackbar } from 'notistack';

export const useResetPassword = () => {
  const navigate = useNavigate();

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { username }, 
    },
  } = useForm({
    defaultValues: {
      rememberMe: false,
    },
    resolver: yupResolver(schema),
  });

  const { mutate, isLoading } = useResetPasswordApi();

  const onSubmit = async (data: Form) => {
    mutate(data, {
      onSuccess: (response) => {
        if (response?.status === StatusCode.SUCCESS) {
          enqueueSnackbar('Ссылка для восстановления пароля отправлена на e-mail', { variant: 'success' });
          navigate(RoutePaths.auth);
        } else {
          const errorMessage = response?.detail || ValidationMessages.defaultError;
          setError('username', {
            type: 'custom',
            message: errorMessage,
          });
        }
      },
      onError: (error) => {
        const errorMessage = (error as any)?.detail || ValidationMessages.defaultError;
        setError('username', {
          type: 'custom',
          message: errorMessage,
        });
      },
    });
  };

  const errorUsername = username ? username.message : '';

  return {
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorUsername, 
    control,
  };
};
