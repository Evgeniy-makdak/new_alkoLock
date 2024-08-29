import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.ROLES_LIST_TABLE];

export const useRoleDeleteFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (id: ID) => RolesApi.deleteItem(id),
    onSuccess: () => refetchQueries(updateQueries),
  });

  return { mutateAsync };
};
