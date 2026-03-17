/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

import { closeSnackbar, enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { Permissions } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
import { StorageKeys } from '@shared/const/storageKeys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { AuthError, IAuthenticate, UserDataLogin } from '@shared/types/BaseQueryTypes';
import { cookieManager } from '@shared/utils/cookie_manager';
import { getFirstAvailableRouter } from '@widgets/nav_bar';

import { useAuthApi } from '../api/authApi';
import { schema } from '../lib/validate';

export const useAuthorization = () => {
  const setState = appStore.setState;
  const [authSuccess, setAuthSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;

  useEffect(() => {
    localStorage.removeItem(StorageKeys.OFFICE);
    setAuthSuccess(false);
  }, []);

  useEffect(() => {
    if (state?.message) {
      enqueueSnackbar(state.message, { variant: state.variant || 'info' });
    }

    const authError = localStorage.getItem('authError');
    if (authError) {
      enqueueSnackbar(authError, { variant: 'error' });
      localStorage.removeItem('authError');
    }
  }, [state]);

  const onAuthSuccess = (data: AppAxiosResponse<IAuthenticate>) => {
    const errors = data?.data?.response?.data?.fieldErrors || [];

    if (errors.length > 0) {
      errors.forEach((error: AuthError) => {
        enqueueSnackbar(`Поле ${error.field} ${error.message}`, { variant: 'error' });
      });
      return;
    }

    if (data.status === StatusCode.SUCCESS) {
      const idToken = data?.data?.idToken;
      const needChangePassword = data?.data?.needChangePassword;

      if (idToken) {
        localStorage.removeItem(StorageKeys.OFFICE);
        cookieManager.removeAll();

        cookieManager.set('bearer', idToken);
        const refreshToken = data.data?.refreshToken;
        if (refreshToken) {
          cookieManager.set('refresh', refreshToken);
        }

        if (needChangePassword === true) {
          navigate(RoutePaths.changePassword, { state: { data: null } });
        } else {
          setState({
            auth: true,
          });
          setAuthSuccess(true);
          closeSnackbar();
        }
      }
    } else if (data.status === StatusCode.UNAUTHORIZED) {
      enqueueSnackbar(data.detail || 'Неверный логин или пароль', { variant: 'error' });
    } else if (data.status === StatusCode.FORBIDDEN) {
      enqueueSnackbar(data.detail || 'Доступ запрещен', { variant: 'error' });
    }
  };

  const {
    mutate: enter,
    isLoading: isAuthLoading,
    accountData,
  } = useAuthApi(authSuccess, onAuthSuccess);

  const {
    handleSubmit,
    setValue,
    register,
    watch,
    control,
    formState: {
      errors: { password, username },
    },
  } = useForm({
    defaultValues: {
      rememberMe: false,
    },
    resolver: yupResolver(schema),
  });

  const handleChangeRemember = (value: boolean) => {
    setValue('rememberMe', value);
  };

  useEffect(() => {
    if (!authSuccess || !accountData) return;

    const { firstAvailableRouter } = getFirstAvailableRouter(accountData.permissions);
    const isGlobalAdmin = accountData.permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
    const branchData = accountData.assignment?.branch;

    if (!firstAvailableRouter) {
      enqueueSnackbar('У вас нет доступа к Админ панели', {
        variant: 'error',
      });
      return;
    }

    if (!isGlobalAdmin && branchData) {
      localStorage.setItem(StorageKeys.OFFICE, JSON.stringify(branchData));
    } else {
      localStorage.removeItem(StorageKeys.OFFICE);
    }

    setState({
      auth: true,
      email: accountData.email,
      isAdmin: isGlobalAdmin,
      permissions: accountData.permissions,
      assignmentBranch: branchData,
      selectedBranchState: isGlobalAdmin ? null : branchData,
      authId: accountData.id,
      fullName: accountData.fullName,
    });

    if (location.pathname === RoutePaths.auth) {
      window.location.href = firstAvailableRouter;
    }
  }, [authSuccess, accountData]);

  const handleAuthorization = (data: UserDataLogin) => {
    setAuthSuccess(false);
    enter(data);
  };

  const errorPassword = password ? password.message : '';
  const errorUsername = username ? username.message : '';

  return {
    handleSubmit: handleSubmit(handleAuthorization),
    isLoading: isAuthLoading,
    register,
    errorPassword,
    errorUsername,
    control,
    rememberMe: watch('rememberMe'),
    handleChangeRemember,
  };
};
