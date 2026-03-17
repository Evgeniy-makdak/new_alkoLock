/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { enqueueSnackbar } from 'notistack';

import { EmailNotificationsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID, IEmailSubscription } from '@shared/types/BaseQueryTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const updateQueries = [QueryKeys.MAILINGS_TABLE];

export const useMailingsActionsApi = () => {
  const update = useUpdateQueries();
  const queryClient = useQueryClient();

  const getSubscriptionsByEmail = async (email: string): Promise<IEmailSubscription[]> => {
    try {
      const response = await EmailNotificationsApi.getList({ query: `all.email.equals=${email}` });
      const emailGroup = response.data?.content?.[0];
      return emailGroup?.subscriptions || [];
    } catch (error) {
      console.error('Ошибка при получении подписок:', error);
      return [];
    }
  };

  const { mutateAsync: deleteMailingByEmail } = useMutation({
    mutationFn: async (email: string) => {
      const subscriptions = await getSubscriptionsByEmail(email);

      const deletePromises = subscriptions.map((subscription) =>
        EmailNotificationsApi.deleteNotification(subscription.id as ID),
      );

      const results = await Promise.allSettled(deletePromises);

      const errors = results.filter((result) => result.status === 'rejected');
      if (errors.length > 0) {
        enqueueSnackbar('Ошибка при удалении некоторых подписок', { variant: 'error' });
        return Promise.reject('Ошибка при удалении подписок');
      }

      return { success: true, deletedCount: subscriptions.length };
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [QueryKeys.MAILINGS_TABLE] });
      update(updateQueries);
    },
  });

  const { mutateAsync: recoverMailingByEmail } = useMutation({
    mutationFn: async (email: string) => {
      const subscriptions = await getSubscriptionsByEmail(email);

      const recoverPromises = subscriptions.map((subscription) =>
        EmailNotificationsApi.recoverNotification(subscription.id as ID),
      );

      const results = await Promise.allSettled(recoverPromises);

      const errors = results.filter((result) => result.status === 'rejected');
      if (errors.length > 0) {
        enqueueSnackbar('Ошибка при восстановлении некоторых подписок', { variant: 'error' });
        return Promise.reject('Ошибка при восстановлении подписок');
      }

      return { success: true, recoveredCount: subscriptions.length };
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [QueryKeys.MAILINGS_TABLE] });
      update(updateQueries);
    },
  });

  const { mutateAsync: trueDeleteMailingByEmail } = useMutation({
    mutationFn: async (email: string) => {
      const subscriptions = await getSubscriptionsByEmail(email);

      const deletePromises = subscriptions.map((subscription) =>
        EmailNotificationsApi.trueDeleteNotification(subscription.id as ID),
      );

      const results = await Promise.allSettled(deletePromises);

      const errors = results.filter((result) => result.status === 'rejected');
      if (errors.length > 0) {
        enqueueSnackbar('Ошибка при полном удалении некоторых подписок', { variant: 'error' });
        return Promise.reject('Ошибка при полном удалении подписок');
      }

      return { success: true, deletedCount: subscriptions.length };
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: [QueryKeys.MAILINGS_TABLE] });
      update(updateQueries);
    },
  });

  return {
    deleteMailingByEmail,
    recoverMailingByEmail,
    trueDeleteMailingByEmail,
  };
};
