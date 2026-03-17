import { EmailNotificationsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.MAILINGS_LIST_TABLE, QueryKeys.MAILINGS_TABLE];
export const useRecoverMailingsFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (email: string) => {
      return EmailNotificationsApi.activateNotification(email);
    },
    onSuccess: () => update(updateQueries),
  });
  return mutateAsync;
};
