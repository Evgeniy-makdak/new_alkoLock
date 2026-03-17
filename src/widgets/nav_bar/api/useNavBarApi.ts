/* eslint-disable no-console */

/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { AccountApi, EventsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import { appStore } from '@shared/model/app_store/AppStore';

// Глобальная переменная для отслеживания интервала
let globalIntervalId: NodeJS.Timeout | null = null;

export const useNavBarApi = (isSliderActive = true) => {
  const { selectedBranchState } = appStore((state) => state);
  const isMountedRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);

  // Получаем данные аккаунта
  const accountQuery = useConfiguredQuery([QueryKeys.ACCOUNT], AccountApi.getAccountData, {
    settings: {
      networkMode: 'offlineFirst',
    } as any,
    triggerOnBranchChange: false,
  });

  // Получаем текущие права
  const permissions = appStore((state) => state.permissions);

  // Мемоизированные проверки прав
  const hasPermission = useMemo(() => {
    return [
      'PERMISSION_SERVICE_MODE_CREATE',
      'PERMISSION_SERVICE_MODE_EDIT',
      'PERMISSION_SERVICE_MODE_READ',
    ].some((permission) => permissions?.includes(permission));
  }, [permissions]);

  // Опции для запроса событий
  const queryOptions = useMemo(
    () => ({
      options:
        permissions?.includes('PERMISSION_SERVICE_MODE_CREATE') && selectedBranchState?.id
          ? { filterOptions: { branchId: selectedBranchState.id } }
          : undefined,
    }),
    [permissions, selectedBranchState?.id],
  );

  // Запрос для получения количества событий
  const countQuery = useConfiguredQuery(
    [QueryKeys.AUTO_SERVICE_COUNT_EVENTS_LIST, selectedBranchState?.id as any],
    hasPermission && isSliderActive ? EventsApi.getEventListCountForAutoServiceURL : undefined,
    queryOptions,
  );

  // Стабильная функция refetch с защитой от дублирования
  const refetchCount = useCallback(async () => {
    if (!isMountedRef.current || !isSliderActive) return;

    const now = Date.now();
    if (now - lastFetchTimeRef.current < 9500) {
      return;
    }

    lastFetchTimeRef.current = now;
    try {
      await countQuery.refetch();
    } catch (error) {
      console.error('Error refetching count:', error);
    }
  }, [countQuery.refetch, isSliderActive]);

  // Эффект для управления интервалом
  useEffect(() => {
    isMountedRef.current = true;

    if (!hasPermission || !isSliderActive) {
      if (globalIntervalId) {
        clearInterval(globalIntervalId);
        globalIntervalId = null;
      }
      return;
    }

    // Очищаем предыдущий интервал
    if (globalIntervalId) {
      clearInterval(globalIntervalId);
    }

    // Устанавливаем новый интервал
    globalIntervalId = setInterval(refetchCount, 10000);
    refetchCount(); // Первый вызов сразу

    return () => {
      isMountedRef.current = false;
      if (globalIntervalId) {
        clearInterval(globalIntervalId);
        globalIntervalId = null;
      }
    };
  }, [hasPermission, refetchCount, isSliderActive]);

  return {
    refetchAccountData: accountQuery.refetch,
    userData: accountQuery.data?.data,
    isLoadingAccountData: accountQuery.isLoading,
    length: countQuery.data?.data || 0,
    error: accountQuery.error,
  };
};
