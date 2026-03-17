import { AlcolocksApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [
  QueryKeys.ALCOLOCK_LIST,
  QueryKeys.ALKOLOCK_ITEM,
  QueryKeys.ALKOLOCK_LIST_TABLE,
];
export const useRecoverAlcolockFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (id: ID) => {
      return AlcolocksApi.activateAlkolock(id);
    },
    onSuccess: () => update(updateQueries),
  });
  return mutateAsync;
};
