/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';

// Импортируем useLocation
import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { Permissions } from '@shared/config/permissionsEnums';
import { appStore } from '@shared/model/app_store/AppStore';
import type { AuthError, IAuthenticate, UserDataLogin } from '@shared/types/BaseQueryTypes';
import { cookieManager } from '@shared/utils/cookie_manager';
import { getFirstAvailableRouter } from '@widgets/nav_bar';

import { useAuthApi } from '../api/authApi';
import { schema } from '../lib/validate';

export const useAuthorization = () => {
  const setState = appStore.setState;
  const [canLoadLoginData, setCanLoadLoginData] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const onSuccess = (data: AppAxiosResponse<IAuthenticate>) => {
    const errors = data?.data?.response?.data?.fieldErrors || [];
    cookieManager.removeAll();
    setState({ auth: false });
    if (errors.length > 0) {
      errors.map((error: AuthError) => {
        enqueueSnackbar(`Поле ${error.field} ${error?.message}`, { variant: 'error' });
      });
    }
    const idToken = data?.data?.idToken;
    if (idToken) {
      // TODO избавить приложение от использования токенов
      // Токены должны быть только в cookie и бэк должен вернуть ошибку
      // not auth например и приложение должно перекинуться на авторизацию
      cookieManager.set('bearer', idToken);

      const refreshToken = data.data?.refreshToken;
      if (refreshToken) {
        cookieManager.set('refresh', refreshToken);
      }

      setState({
        auth: true,
      });

      setCanLoadLoginData(true);

      // После успешной авторизации перезагружаем текущую страницу
      navigate(location.pathname, { replace: true });
    }
  };

  const {
    mutate: enter,
    isLoading,
    accountData,
    isError,
    isSuccess,
    canEnter,
    isPlaceholderData,
    isSuccessGetAccountData,
  } = useAuthApi(canLoadLoginData, onSuccess);

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

  const handleChangeRemeber = (value: boolean) => {
    setValue('rememberMe', value);
  };

  const canNotEnter =
    !isSuccessGetAccountData ||
    isLoading ||
    isError ||
    !isSuccess ||
    !accountData?.permissions ||
    isPlaceholderData ||
    !canEnter;

  useEffect(() => {
    if (canNotEnter) return;
    // TODO => поменять всю работу с доступами когда на бэке поменяется структура доступов
    const { firstAvailableRouter } = getFirstAvailableRouter(accountData?.permissions);
    const isGlobalAdmin = accountData?.permissions?.includes(Permissions.SYSTEM_GLOBAL_ADMIN);

    if (!firstAvailableRouter) {
      enqueueSnackbar(`У вас нет доступа к Админ панели`, {
        variant: 'error',
      });
      return;
    }
    setState({
      auth: true,
      email: accountData?.email,
      isAdmin: isGlobalAdmin,
      permissions: accountData?.permissions,
      assignmentBranch: accountData?.assignment?.branch,
    });
    setCanLoadLoginData(false);
    navigate(firstAvailableRouter);
  }, [canNotEnter, accountData]);

  const handleAuthorization = (data: UserDataLogin) => {
    enter(data);
  };

  const errorPassword = password ? password?.message : '';
  const errorUsername = username ? username?.message : '';
  return {
    handleSubmit: handleSubmit(handleAuthorization),
    isLoading,
    register,

    errorPassword,
    errorUsername,
    control,
    rememberMe: watch('rememberMe'),
    handleChangeRemeber,
  };
};
