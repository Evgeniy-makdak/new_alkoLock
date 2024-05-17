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
export const useAlkolockDeleteFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync: deleteAlkolock } = useMutation({
    mutationFn: (id: ID) => AlcolocksApi.deleteAlkolock(id),
    onSuccess: () => update(updateQueries),
  });
  return { deleteAlkolock };
};
