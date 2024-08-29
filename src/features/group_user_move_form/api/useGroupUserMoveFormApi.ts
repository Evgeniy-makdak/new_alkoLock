import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuery = [QueryKeys.USER_LIST];

export const useGroupUserMoveFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync: moveUser } = useMutation({
    mutationFn: ({ userId, branchId }: { userId: ID; branchId: ID }) =>
      UsersApi.switchBranch({ id: userId, filterOptions: { branchId } }),
    onSuccess: () => refetchQueries(updateQuery),
  });

  return { moveUser };
};
