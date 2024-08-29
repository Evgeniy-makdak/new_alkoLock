import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQuery = [QueryKeys.CAR_LIST];

export const useGroupCarMoveFormApi = () => {
  const refetchQueries = useUpdateQueries();
  const { mutateAsync: moveCar } = useMutation({
    mutationFn: ({
      carId,
      branchId,
      widthDevice,
    }: {
      carId: ID;
      branchId: ID;
      widthDevice: boolean;
    }) => CarsApi.switchBranch({ id: carId, filterOptions: { branchId } }, widthDevice),
    onSuccess: () => refetchQueries(updateQuery),
  });

  return { moveCar };
};
