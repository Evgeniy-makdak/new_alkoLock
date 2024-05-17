import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.VEHICLES_PAGE_TABLE, QueryKeys.CAR_LIST, QueryKeys.CAR_ITEM];

export const useDeleteCarFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (id: ID) => {
      return CarsApi.deleteCar(id);
    },
    onSuccess: () => update(updateQueries),
  });
  return mutateAsync;
};
