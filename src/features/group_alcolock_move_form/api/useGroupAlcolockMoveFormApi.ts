import { AlcolocksApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuery = [QueryKeys.ALKOLOCK_LIST_TABLE];

export const useGroupAlcolockMoveFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync: moveAlcolock } = useMutation({
    mutationFn: ({
      alcolockId,
      branchId,
      withVehicle,
    }: {
      alcolockId: ID;
      branchId: ID;
      withVehicle: boolean;
    }) => AlcolocksApi.switchBranch({ id: alcolockId, filterOptions: { branchId } }, withVehicle),
    onSuccess: () => refetchQueries(updateQuery),
  });

  return { moveAlcolock };
};
