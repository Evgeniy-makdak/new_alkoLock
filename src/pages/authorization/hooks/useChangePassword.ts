// import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';

// import { enqueueSnackbar } from 'notistack';

import { yupResolver } from '@hookform/resolvers/yup';
// import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
// import { Permissions } from '@shared/config/permissionsEnums';
// import { StatusCode } from '@shared/const/statusCode';
// import { appStore } from '@shared/model/app_store/AppStore';
import type {  UserDataLogin } from '@shared/types/BaseQueryTypes';
// import { cookieManager } from '@shared/utils/cookie_manager';
// import { getFirstAvailableRouter } from '@widgets/nav_bar';

// import { useAuthApi } from '../api/authApi';
import { schema } from '../lib/validateChange';

export const useChangePassword = () => {
  // const setState = appStore.setState;
  // const [canLoadLoginData, setCanLoadLoginData] = useState(false);
  // const navigate = useNavigate();
  const {state} = useLocation();
  console.log(state);
  

  // const onSuccess = () => {

  // };

  // const {
  //   mutate: enter,
  //   isLoading,
  //   accountData,
  //   isError,
  //   isSuccess,
  //   canEnter,
  //   isPlaceholderData,
  //   isSuccessGetAccountData,
  // } = useAuthApi(canLoadLoginData, onSuccess);

  const {
    handleSubmit,
    // setValue,
    register,
    // watch,
    control,
    formState: {
      errors: { oldPassword, newPassword, repeatNewPassword },
    },
  } = useForm({
    // defaultValues: {
    //   rememberMe: false,
    // },
    resolver: yupResolver(schema),
  });

  const handleAuthorization = (data: UserDataLogin) => {
    console.log(data);
  };
  const isLoading = false;

  const errorOldPassword = oldPassword ? oldPassword?.message : '';
  const errorNewPassword = newPassword ? newPassword?.message : '';
  const errorRepeatNewPassword = repeatNewPassword ? repeatNewPassword?.message : '';
  return {
    handleSubmit: handleSubmit(handleAuthorization),
    isLoading,
    register,
    errorOldPassword,
    errorNewPassword,
    errorRepeatNewPassword,
    control,
  };
};
