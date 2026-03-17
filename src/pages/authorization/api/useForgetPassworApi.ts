import { UsersApi } from '@shared/api/baseQuerys';
import { useMutation } from '@tanstack/react-query';

export type ForgetPasswordData = {
  email: string;
  password: string;
};

export const useForgetPasswordApi = () => {
  const { isPending, mutate, isError, isSuccess, data } = useMutation({
    mutationFn: (data: ForgetPasswordData) => UsersApi.forgetPassword(data),
  });

  return {
    mutate,
    isLoading: isPending,
    isError,
    isSuccess,
    data,
  };
};
