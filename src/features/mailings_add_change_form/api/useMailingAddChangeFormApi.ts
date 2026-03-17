/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { enqueueSnackbar } from 'notistack';

import { EmailNotificationsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { useUpdateQueries } from '@shared/hooks/useUpdateQuerys';
import type { ID } from '@shared/types/BaseQueryTypes';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const updateQueries = [QueryKeys.MAILINGS_TABLE];

interface MailingDataItem {
  id?: number;
  eventTypeId: number;
  startTime: string;
  endTime: string;
  email: string;
  branchId: number;
}

interface MailingDataEdit {
  email?: string;
  eventTypeId?: number;
  startTime?: string;
  endTime?: string;
  branchId?: number;
}

export const useMailingAddChangeFormApi = (id: ID) => {
  const update = useUpdateQueries();
  const queryClient = useQueryClient();

  const [currentBranchId, setCurrentBranchId] = useState<number | null>(null);

  useEffect(() => {
    import('@shared/model/app_store/AppStore').then((module) => {
      const branchId = module.appStore.getState().selectedBranchState?.id;
      setCurrentBranchId(branchId ? Number(branchId) : null);
    });
  }, []);

  const getQueryString = () => {
    if (!id) return '';

    const params = [];
    if (currentBranchId) {
      params.push(`all.branch.id.in=${currentBranchId}`);
    }
    params.push(`all.email.equals=${id}`);

    return params.join('&');
  };

  const { data, isLoading } = useConfiguredQuery(
    //@ts-expect-error: временное решение
    [QueryKeys.MAILING_ITEM, id, currentBranchId],
    EmailNotificationsApi.getList,
    {
      options: id ? { query: getQueryString() } : {},
      settings: {
        enabled: !!id && currentBranchId !== null,
      } as any,
    },
  );

  const { mutateAsync: changeMailing } = useMutation({
    mutationFn: async ({ email, data }: { email: string; data: MailingDataEdit }) => {
      const response = await EmailNotificationsApi.updateNotification(email, data);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'error' });
        return Promise.reject(response.detail);
      } else {
        await queryClient.refetchQueries({ queryKey: [QueryKeys.MAILINGS_TABLE] });
        await queryClient.refetchQueries({ queryKey: [QueryKeys.MAILING_ITEM] });
        update(updateQueries);
        return response;
      }
    },
  });

  const { mutateAsync: createMailing } = useMutation({
    mutationFn: async (data: MailingDataItem[]) => {
      const response = await EmailNotificationsApi.createNotification(data as any);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'error' });
        return Promise.reject(response.detail);
      } else {
        await queryClient.refetchQueries({ queryKey: [QueryKeys.MAILINGS_TABLE] });
        await queryClient.refetchQueries({ queryKey: [QueryKeys.MAILING_ITEM] });
        update(updateQueries);
        return response;
      }
    },
  });

  const { mutateAsync: deleteMailing } = useMutation({
    mutationFn: async (subscriptionId: number) => {
      const response = await EmailNotificationsApi.deleteNotification(subscriptionId);
      if (response.status === StatusCode.CONFLICT) {
        enqueueSnackbar(response.detail, { variant: 'error' });
        return Promise.reject(response.detail);
      } else {
        await queryClient.refetchQueries({ queryKey: [QueryKeys.MAILINGS_TABLE] });
        await queryClient.refetchQueries({ queryKey: [QueryKeys.MAILING_ITEM] });
        update(updateQueries);
        return response;
      }
    },
  });

  const mailings = data?.data?.content?.[0];
  const subscriptions = mailings?.subscriptions || [];

  return {
    mailings: subscriptions,
    isLoading,
    changeMailing,
    createMailing,
    deleteMailing,
    email: mailings?.email,
  };
};
