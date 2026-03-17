/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import { UsersApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

export const useUsersTableApi = (options: QueryOptions) => {
  const { statusFilter } = useStatusFilter();
  const filterKey = statusFilter as any;

  const [isUsersTabActive, setIsUsersTabActive] = useState(false);
  const wasUsersTabActiveRef = useRef(false);

  useEffect(() => {
    const checkCurrentTab = () => {
      const pathname = window.location.pathname;
      const newIsActive = pathname.includes('/users') || pathname.includes('/user');

      wasUsersTabActiveRef.current = isUsersTabActive;
      setIsUsersTabActive(newIsActive);
    };

    checkCurrentTab();

    const handleRouteChange = () => {
      checkCurrentTab();
    };

    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Добавление логики для параметров запроса
  let additionalQuery = '';
  if (statusFilter === 'Активные') {
    additionalQuery = '&all.isActive.in=true';
  } else if (statusFilter === 'Неактивные') {
    additionalQuery = '&all.isActive.in=false';
  }

  // Модификация options с учётом дополнительных параметров
  const modifiedOptions: QueryOptions = {
    ...options,
    query: options.query ? `${options.query}${additionalQuery}` : additionalQuery,
  };

  // Используем временное отключение при переходе с вкладки
  const [enableQuery, setEnableQuery] = useState(isUsersTabActive);

  useEffect(() => {
    // Если только что переключились с вкладки пользователей
    if (wasUsersTabActiveRef.current && !isUsersTabActive) {
      // Немедленно отключаем запросы
      setEnableQuery(false);
    } else if (isUsersTabActive) {
      // Включаем только если находимся на вкладке пользователей
      setEnableQuery(true);
    }

    wasUsersTabActiveRef.current = isUsersTabActive;
  }, [isUsersTabActive]);

  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.USER_LIST_TABLE, filterKey, enableQuery],
    UsersApi.getList,
    {
      options: modifiedOptions,
      settings: {
        refetchInterval: enableQuery ? 10000 : false,
        enabled: enableQuery,
      } as any,
    },
  );

  return { users: data?.data, isLoading, refetch };
};
