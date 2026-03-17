/* eslint-disable prettier/prettier */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { useForgetPasswordApi } from '@pages/authorization/api/useForgetPassworApi';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';

import { Form, schema } from '../lib/validateForget';

export const useForgetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email; // Получаем email из location state

  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { newPassword, repeatNewPassword },
    },
  } = useForm<Form>({
    // @ts-expect-error: временное решение
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

    if (!email) {
      enqueueSnackbar('Не удалось определить email', { variant: 'error' });
      return;
    }

    // Формируем данные для отправки на сервер согласно требованиям
    const requestData = {
      email: email,
      password: data.newPassword,
    };

    mutate(requestData, {
      //@ts-expect-error: временное решение
      onSuccess: (response: { status: StatusCode; detail: ValidationMessages }) => {
        if (response?.status === StatusCode.SUCCESS) {
          enqueueSnackbar('Пароль успешно изменён', { variant: 'success' });
          navigate(RoutePaths.auth); // Перенаправление на страницу входа
        } else {
          const errorMessage = response?.detail || ValidationMessages.defaultError;
          setError('newPassword', {
            type: 'custom',
            message: errorMessage,
          });
        }
      },
      onError: (error: any) => {
        const errorMessage = (error as any)?.detail || ValidationMessages.defaultError;
        setError('newPassword', {
          type: 'custom',
          message: errorMessage,
        });
      },
    });
  };

  return {
    //@ts-expect-error: временное решение
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorNewPassword: newPassword?.message || '',
    errorRepeatNewPassword: repeatNewPassword?.message || '',
    control,
  };
};
