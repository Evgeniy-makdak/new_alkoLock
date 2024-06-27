import { enqueueSnackbar } from 'notistack';

import { RolesApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
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
    mutationFn: async ({ id, data }: { id: ID; data: ChangeRoleData }) => {
      const response = await RolesApi.changeItem(data, id);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'warning' });
      } else {
        update(updateQueries);
      }
    },
  });

  const { mutateAsync: createRole } = useMutation({
    mutationFn: async (data: CreateRoleData) => {
      const response = await RolesApi.createItem(data);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'warning' });
      } else {
        update(updateQueries);
      }
    },
  });

  return { role: data?.data, isLoading, changeRole, createRole };
};
