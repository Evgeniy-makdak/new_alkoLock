import { UsersApi } from '@shared/api/baseQuerys';
import type { ChangePasswordData } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const usePasswordFormApi = () => {
  const { mutateAsync: changePassword } = useMutation({
    mutationFn: (data: ChangePasswordData) => UsersApi.changePassword(data),
  });

  return { changePassword };
};
