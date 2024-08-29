import type { QueryKeys } from '@shared/const/storageKeys';
import { useQueryClient } from '@tanstack/react-query';

/**
 *
 * @returns updateQuery => функция которая принимает аргументом массив ключей запросов {@link QueryKeys}[]
 */
export const useUpdateQueries = () => {
  const queryClient = useQueryClient();
  return (arr: (QueryKeys | string)[]) => {
    arr.map((key) => queryClient.refetchQueries({ queryKey: [key] }));
  };
};
