import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.BRANCH_LIST_TABLE, QueryKeys.BRANCH_LIST_SELECT];

export const useGroupDeleteFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (id: ID) => BranchApi.deleteBranch(id),
    onSuccess: () => refetchQueries(updateQueries),
  });

  return { mutateAsync };
};
