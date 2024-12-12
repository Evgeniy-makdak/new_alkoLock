import { UsersApi } from '@shared/api/baseQuerys';
import { useMutation } from '@tanstack/react-query';

export type ResetPasswordData = { email: string };

export const useResetPasswordApi = () => {
  const { isPending, mutate, isError, isSuccess, data } = useMutation({
    mutationFn: (data: ResetPasswordData) => UsersApi.resetPassword(data), 
  });

  return {
    mutate,
    isLoading: isPending,
    isError,
    isSuccess,
    data,
  };
};
