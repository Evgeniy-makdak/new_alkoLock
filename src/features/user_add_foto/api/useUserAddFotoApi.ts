import { UsersApi } from '@shared/api/baseQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

export const useUserAddFotoApi = (id: ID) => {
  const { mutateAsync: addPhoto, isPending } = useMutation({
    mutationFn: (data: FormData) => UsersApi.addPhoto(data, id),
  });

  return { addPhoto, isLoading: isPending };
};
