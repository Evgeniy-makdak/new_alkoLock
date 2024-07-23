import { enqueueSnackbar } from 'notistack';

import { BranchApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.BRANCH_LIST_TABLE, QueryKeys.BRANCH_LIST_SELECT];

export const useGroupAddFormApi = (id: ID) => {
  const update = useUpdateQueries();
  const { data, isLoading } = useConfiguredQuery([QueryKeys.BRANCH_ITEM], BranchApi.getBranch, {
    options: id,
    settings: {
      enabled: !!id,
    },
  });

  const { mutateAsync: editGroup } = useMutation({
    mutationFn: async ({ id, name }: { id: ID; name: string }) => {
      const response = await BranchApi.editBranch(id, name);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'error' });
        return Promise.reject(new Error(response.detail));
      } else {
        update(updateQueries);
        return response;
      }
    },
  });

  const { mutateAsync: addGroup } = useMutation({
    mutationFn: async (name: string) => {
      const response = await BranchApi.createBranch(name);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'error' });
        return Promise.reject(new Error(response.detail));
      } else {
        update(updateQueries);
        return response;
      }
    },
  });

  return { group: data?.data, isLoading, addGroup, editGroup };
};
