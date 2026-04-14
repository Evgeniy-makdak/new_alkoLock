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

import i18n from '../../../i18n';
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

  const localizeForgetPasswordError = (rawMessage: string): string => {
    const msg = String(rawMessage || '');
    const lower = msg.toLowerCase();
    const isSameAsPrevious =
      lower.includes('новый пароль совпадает с предыдущим') ||
      lower.includes('new password matches previous password') ||
      lower.includes('new password must not match current password') ||
      lower.includes('пароль не должен совпадать');
    if (isSameAsPrevious) return i18n.t('validation.newPasswordMustDifferFromCurrent');
    return msg || ValidationMessages.defaultError;
  };

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
      enqueueSnackbar(i18n.t('auth.emailNotDetermined'), { variant: 'error' });
      return;
    }

    // Формируем данные для отправки на сервер согласно требованиям
    const requestData = {
      email: email,
      password: data.newPassword,
    };

    mutate(requestData, {
      //@ts-expect-error: временное решение
      onSuccess: (response: { status: StatusCode; detail: string }) => {
        if (response?.status === StatusCode.SUCCESS) {
          enqueueSnackbar(i18n.t('auth.passwordChangedSuccess'), { variant: 'success' });
          navigate(RoutePaths.auth); // Перенаправление на страницу входа
        } else {
          const errorMessage = response?.detail || ValidationMessages.defaultError;
          const localizedMessage = localizeForgetPasswordError(errorMessage);
          setError('newPassword', {
            type: 'custom',
            message: localizedMessage,
          });
        }
      },
      onError: (error: any) => {
        const errorMessage =
          (error as any)?.response?.data?.detail ||
          (error as any)?.detail ||
          ValidationMessages.defaultError;
        const localizedMessage = localizeForgetPasswordError(errorMessage);
        setError('newPassword', {
          type: 'custom',
          message: localizedMessage,
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
