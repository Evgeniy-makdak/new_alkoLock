import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { enqueueSnackbar } from 'notistack';
import { yupResolver } from '@hookform/resolvers/yup';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { Permissions } from '@shared/config/permissionsEnums';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { StatusCode } from '@shared/const/statusCode';
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
      errors.forEach((error: AuthError) => {
        enqueueSnackbar(`Поле ${error.field} ${error.message}`, { variant: 'error' });
      });
    } else if (data.status === StatusCode.SUCCESS) {
      const idToken = data?.data?.idToken;
      const needChangePassword = data?.data?.needChangePassword;

      if (idToken) {
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

          setCanLoadLoginData(true);

          navigate(location.pathname, { replace: true });
        }
      }
    } else if (data.status === StatusCode.UNAUTHORIZED) {
      enqueueSnackbar(data.detail || 'Неверный логин или пароль', { variant: 'error' });
    } else if (data.status === StatusCode.FORBIDDEN) {
      enqueueSnackbar(data.detail || 'Доступ запрещен', { variant: 'error' });
    } else {
      console.warn('Неизвестный статус ответа:', data.data.response?.status);
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

  const handleChangeRemember = (value: boolean) => {
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
    const { firstAvailableRouter } = getFirstAvailableRouter(accountData?.permissions);
    const isGlobalAdmin = accountData?.permissions?.includes(Permissions.SYSTEM_GLOBAL_ADMIN);

    if (!firstAvailableRouter) {
      enqueueSnackbar('У вас нет доступа к Админ панели', {
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

  const errorPassword = password ? password.message : '';
  const errorUsername = username ? username.message : '';

  return {
    handleSubmit: handleSubmit(handleAuthorization),
    isLoading,
    register,
    errorPassword,
    errorUsername,
    control,
    rememberMe: watch('rememberMe'),
    handleChangeRemember,
  };
};
