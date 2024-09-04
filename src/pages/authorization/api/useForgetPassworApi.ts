import { UsersApi } from '@shared/api/baseQuerys';
import type { ChangePasswordData } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const useForgetPasswordApi = () => {
  const { isPending, mutate, isError, isSuccess, data } = useMutation({
    mutationFn: (data: ChangePasswordData) => UsersApi.changePassword(data),
  });

  return {
    mutate,
    isLoading: isPending,
    isError,
    isSuccess,
    data,
  };
};
