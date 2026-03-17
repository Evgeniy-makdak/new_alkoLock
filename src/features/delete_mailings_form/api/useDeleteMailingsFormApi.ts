import { EmailNotificationsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import { useMutation } from '@tanstack/react-query';

const updateQueries = [QueryKeys.MAILINGS_LIST_TABLE, QueryKeys.MAILING_ITEM];
export const useDeleteMailingsFormApi = () => {
  const update = useUpdateQueries();
  const { mutateAsync } = useMutation({
    mutationFn: (email: string) => {
      return EmailNotificationsApi.deactivateNotification(email);
    },
    onSuccess: () => update(updateQueries),
  });
  return mutateAsync;
};
