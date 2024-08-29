import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuery = [QueryKeys.USER_LIST];

export const useGroupUserAddFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync: moveUsers } = useMutation({
    mutationFn: ({ userIds, branchId }: { userIds: ID[]; branchId: ID }) =>
      BranchApi.moveItem(branchId, userIds),
    onSuccess: () => refetchQueries(updateQuery),
  });

  return { moveUsers };
};
