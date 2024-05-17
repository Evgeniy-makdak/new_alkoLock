import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuery = [QueryKeys.BRANCH_LIST_TABLE, QueryKeys.BRANCH_LIST_SELECT];

export const useGroupAddFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync: addGroup } = useMutation({
    mutationFn: (name: string) => BranchApi.createBranch(name),
    onSuccess: () => refetchQueries(updateQuery),
  });

  const { mutateAsync: editGroup } = useMutation({
    mutationFn: (data: { id: ID; name: string }) => BranchApi.editBranch(data.id, data.name),
    onSuccess: () => refetchQueries(updateQuery),
  });
  return { addGroup, editGroup };
};
