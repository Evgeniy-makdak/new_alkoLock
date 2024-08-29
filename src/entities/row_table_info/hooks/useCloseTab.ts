import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';

export const useCloseTab = (handleClose: () => void, updateTableListQuery: string[]) => {
  const updateQuery = useUpdateQueries();

  return () => {
    handleClose();
    updateQuery(updateTableListQuery);
  };
};
