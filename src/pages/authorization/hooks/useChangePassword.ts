/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { useChangePasswordApi } from '@pages/authorization/api/useChangePasswordApi';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
import { ValidationMessages } from '@shared/validations/validation_messages';

import i18n from '../../../i18n';
import { Form, schema } from '../lib/validateChange';

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
    // @ts-expect-error: временное решение
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
      //@ts-expect-error: временное решение
      onSuccess: (response: { status: StatusCode; detail: string }) => {
        if (response?.status === StatusCode.SUCCESS) {
          enqueueSnackbar(i18n.t('auth.passwordChangedSuccess'), { variant: 'success' });
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
      onError: (error: any) => {
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
    //@ts-expect-error: временное решение
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorCurrentPassword: currentPassword?.message || '',
    errorNewPassword: newPassword?.message || '',
    errorRepeatNewPassword: repeatNewPassword?.message || '',
    control,
  };
};
