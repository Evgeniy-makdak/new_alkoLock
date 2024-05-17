import { RolesApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ChangeRoleData, CreateRoleData, ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.ROLES_LIST_TABLE];
export const useRoleAddChangeFormApi = (id: ID) => {
  const update = useUpdateQueries();
  const { data, isLoading } = useConfiguredQuery([QueryKeys.ROLE_ITEM], RolesApi.getItem, {
    options: id,
    settings: {
      enabled: !!id,
    },
  });

  const { mutateAsync: changeRole } = useMutation({
    mutationFn: ({ id, data }: { id: ID; data: ChangeRoleData }) => RolesApi.changeItem(data, id),
    onSuccess: () => update(updateQueries),
  });

  const { mutateAsync: createRole } = useMutation({
    mutationFn: (data: CreateRoleData) => RolesApi.createItem(data),
    onSuccess: () => update(updateQueries),
  });

  return { role: data?.data, isLoading, changeRole, createRole };
};
