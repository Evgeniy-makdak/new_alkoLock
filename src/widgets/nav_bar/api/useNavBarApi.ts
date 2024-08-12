import { useEffect, useRef } from 'react';

import { AccountApi, EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { appStore } from '@shared/model/app_store/AppStore';

export const useNavBarApi = () => {
  const { selectedBranchState } = appStore((state) => state);
  const {
    data,
    isLoading: isLoadingAccountData,
    error,
    refetch: refetchAccountData,
  } = useConfiguredQuery([QueryKeys.ACCOUNT], AccountApi.getAccountData, {
    settings: {
      networkMode: 'offlineFirst',
    },
    triggerOnBranchChange: false,
  });

  // Используем useRef, чтобы хранить интервал и избежать утечки памяти
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: count, refetch: refetchCount } = useConfiguredQuery(
    [QueryKeys.AUTO_SERVICE_COUNT_EVENTS_LIST],
    EventsApi.getEventListCountForAutoServiceURL,
    { options: { filterOptions: { branchId: selectedBranchState?.id } } },
  );

  useEffect(() => {
    if (count?.data > 0) {
      intervalRef.current = setInterval(() => {
        refetchCount();
      }, 10000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [count?.data, refetchCount]);

  return {
    refetchAccountData,
    userData: data?.data,
    isLoadingAccountData,
    length: count?.data || 0,
    error,
  };
};