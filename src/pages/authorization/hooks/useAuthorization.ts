/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
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
import { cookieManager, getBearerToken } from '@shared/utils/cookie_manager';
import { publishAuthSessionFromBearer } from '@shared/lib/authSessionSync';
import { getFirstAvailableRouter } from '@widgets/nav_bar';
import { notifyDesktopAuthReady } from '@widgets/chat/chatPopup/electronPopupAuth';

import i18n from '../../../i18n';
import { useAuthApi } from '../api/authApi';
import {
  clearRememberMePreference,
  findRememberedPassword,
  getLastRememberedAccount,
  loadRememberedAccounts,
  saveRememberedAccount,
} from '../lib/rememberedCredentials';
import { schema } from '../lib/validate';

export const useAuthorization = () => {
  const setState = appStore.setState;
  const [authSuccess, setAuthSuccess] = useState(false);
  const [rememberedUsernames, setRememberedUsernames] = useState<string[]>([]);
  const lastLoginAttemptRef = useRef<UserDataLogin | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = location;

  useEffect(() => {
    localStorage.removeItem(StorageKeys.OFFICE);
    setAuthSuccess(false);

    const bearer = cookieManager.get('bearer');
    if (bearer && !getBearerToken()) {
      cookieManager.removeAll();
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    }
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
        enqueueSnackbar(
          i18n.t('auth.fieldValidationError', { field: error.field, message: error.message }),
          {
            variant: 'error',
          },
        );
      });
      return;
    }

    if (data.status === StatusCode.SUCCESS) {
      const idToken = data?.data?.idToken;
      const needChangePassword = data?.data?.needChangePassword;

      if (idToken) {
        localStorage.removeItem(StorageKeys.OFFICE);
        cookieManager.removeAll();

        const loginAttempt = lastLoginAttemptRef.current;
        const rememberMe = loginAttempt?.rememberMe === true;
        const tokenDays = rememberMe ? 30 : null;

        cookieManager.set('bearer', idToken, tokenDays);
        const refreshToken = data.data?.refreshToken;
        if (refreshToken) {
          cookieManager.set('refresh', refreshToken, tokenDays);
        }
        publishAuthSessionFromBearer(
          needChangePassword === true ? { needChangePassword: true } : undefined,
        );
        notifyDesktopAuthReady();

        if (rememberMe && loginAttempt?.username) {
          saveRememberedAccount(loginAttempt.username, loginAttempt.password ?? '');
          setRememberedUsernames(loadRememberedAccounts().map((account) => account.username));
        } else if (!rememberMe) {
          clearRememberMePreference();
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
      enqueueSnackbar(data.detail || i18n.t('auth.invalidCredentials'), { variant: 'error' });
    } else if (data.status === StatusCode.FORBIDDEN) {
      enqueueSnackbar(data.detail || i18n.t('auth.accessDenied'), { variant: 'error' });
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

  const watchedUsername = watch('username');

  useEffect(() => {
    try {
      const lastAccount = getLastRememberedAccount();
      if (lastAccount) {
        setValue('username', lastAccount.username);
        setValue('password', lastAccount.password);
        setValue('rememberMe', true);
      }
      setRememberedUsernames(loadRememberedAccounts().map((account) => account.username));
    } catch {
      /* ignore */
    }
  }, [setValue]);

  useEffect(() => {
    const username = typeof watchedUsername === 'string' ? watchedUsername.trim() : '';
    if (!username) return;

    const savedPassword = findRememberedPassword(username);
    if (savedPassword) {
      setValue('password', savedPassword);
    }
  }, [watchedUsername, setValue]);

  const handleUsernameChange = (username: string) => {
    setValue('username', username, { shouldDirty: true, shouldValidate: true });
    const savedPassword = findRememberedPassword(username);
    if (savedPassword) {
      setValue('password', savedPassword, { shouldDirty: true, shouldValidate: true });
    }
  };

  const handleChangeRemember = (value: boolean) => {
    setValue('rememberMe', value);
  };

  useEffect(() => {
    if (!authSuccess || !accountData) return;

    const permissions = accountData.permissions ?? [];
    const { firstAvailableRouter } = getFirstAvailableRouter(permissions);
    const isGlobalAdmin = permissions.includes(Permissions.SYSTEM_GLOBAL_ADMIN);
    const branchData = accountData.assignment?.branch;

    if (!firstAvailableRouter) {
      enqueueSnackbar(i18n.t('auth.noAdminPanelAccess'), {
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
      permissions,
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
    lastLoginAttemptRef.current = data;
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
    rememberedUsernames,
    handleUsernameChange,
    usernameValue: watch('username') ?? '',
  };
};
