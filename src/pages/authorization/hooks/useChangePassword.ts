/* eslint-disable @typescript-eslint/no-explicit-any */
import { useForm, type Resolver } from 'react-hook-form';

import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import { useChangePasswordApi } from '@pages/authorization/api/useChangePasswordApi';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { StatusCode } from '@shared/const/statusCode';
import { appStore } from '@shared/model/app_store/AppStore';
import { ValidationMessages } from '@shared/validations/validation_messages';

import i18n from '../../../i18n';
import { Form, schema } from '../lib/validateChange';

export const useChangePassword = () => {
  const {
    handleSubmit,
    register,
    control,
    setError,
    formState: {
      errors: { currentPassword, newPassword, repeatNewPassword },
    },
  } = useForm<Form>({
    resolver: yupResolver(schema) as Resolver<Form>,
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

    mutate(data as Parameters<typeof mutate>[0], {
      onSuccess: (response: AppAxiosResponse<unknown>) => {
        if (response?.status === StatusCode.SUCCESS) {
          enqueueSnackbar(i18n.t('auth.passwordChangedSuccess'), { variant: 'success' });
          appStore.getState().logout(false);
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
    handleSubmit: handleSubmit(onSubmit),
    isLoading,
    register,
    errorCurrentPassword: currentPassword?.message || '',
    errorNewPassword: newPassword?.message || '',
    errorRepeatNewPassword: repeatNewPassword?.message || '',
    control,
  };
};
