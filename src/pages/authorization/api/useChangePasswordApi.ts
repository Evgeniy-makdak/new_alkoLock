import { useNavigate } from 'react-router-dom';

import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';
import { UsersApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import type { ChangePasswordData } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const useChangePasswordApi = (onSuccess?: (data: AppAxiosResponse<unknown>) => void) => {
  const navigate = useNavigate();

  const { isPending, mutate, isError, isSuccess, data } = useMutation({
    mutationFn: (data: ChangePasswordData) => UsersApi.changePassword(data),
    onSuccess: (data) => {
      if (onSuccess) {
        onSuccess(data);
      }
      navigate(RoutePaths.auth);
    },
  });

  return {
    mutate,
    isLoading: isPending,
    isError,
    isSuccess,
    data,
  };
};
