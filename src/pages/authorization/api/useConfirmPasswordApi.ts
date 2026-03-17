import { UsersApi } from '@shared/api/baseQuerys';
import { useMutation } from '@tanstack/react-query';

export type ConfirmPasswordData = {
  email: string;
  verificationCode: string;
};

export const useConfirmPasswordApi = () => {
  const { isPending, mutate, isError, isSuccess, data } = useMutation({
    mutationFn: (data: ConfirmPasswordData) => UsersApi.confirmPassword(data),
  });

  return {
    mutate,
    isLoading: isPending,
    isError,
    isSuccess,
    data,
  };
};
