import { BranchApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuery = [QueryKeys.ALKOLOCK_LIST_TABLE];

export const useGroupAlcolocksAddFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutate } = useMutation({
    mutationFn: ({ branchId, ids }: { branchId: ID; ids: ID[] }) =>
      BranchApi.moveItem(branchId, ids),
    onSuccess: () => refetchQueries(updateQuery),
  });
  return { mutate };
};
