import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.USER_LIST_TABLE, QueryKeys.USER_LIST];
export const useDeleteUserFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (id: ID) => {
      return UsersApi.deleteUser(id);
    },
    onSuccess: () => update(updateQueries),
  });
  return mutateAsync;
};
