/* eslint-disable react-hooks/exhaustive-deps */

/* eslint-disable no-console */
import { useEffect, useRef, useState } from 'react';

import { AlcolocksApi, EventsApi } from '@shared/api/baseQuerys';
import { StatusCode } from '@shared/const/statusCode';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useDeviceStatus } from '@widgets/alkozamki_info/DeviceStatusContext';

export const useAlkozamkiInfoApi = (id: ID) => {
  const { updateDeviceStatusFromApiResponse } = useDeviceStatus(); // 👈 используем новую функцию
  const [currentAutoServiceType, setCurrentAutoServiceType] = useState<string>();
  const prevIdRef = useRef<ID>(); // 👈 для отслеживания предыдущего ID

  useEffect(() => {
    // 👇 Сбрасываем autoServiceType только если ID действительно изменился
    if (id !== prevIdRef.current) {
      setCurrentAutoServiceType(undefined);
      prevIdRef.current = id;
    }
  }, [id]);

  const {
    data: alcolockResponse,
    isLoading,
    error,
    refetch,
  } = useConfiguredQuery([QueryKeys.ALKOLOCK_ITEM], AlcolocksApi.getAlkolock, {
    options: id,
    settings: { enabled: !!id },
  });

  // 👇 Запрос для получения списка заявок сервисного режима
  const { data: autoServiceListResponse, refetch: refetchAutoServiceList } = useConfiguredQuery(
    [QueryKeys.AVTOSERVISE_EVENTS_ITEM], // 👈 используем без id в ключе
    EventsApi.getEventListForAutoService,
    {
      options: {
        filterOptions: {
          status: 'ACTIVE', // 👈 только активные заявки
          // deviceId фильтруем на клиенте, так как серверная фильтрация может не работать
        },
        searchQuery: undefined,
      } as QueryOptions,
      settings: {
        enabled: !!id,
        staleTime: 0,
      },
    },
  );

  // 👇 ФИЛЬТРУЕМ НА КЛИЕНТЕ - получаем заявки только для текущего устройства
  const activeAutoServiceForCurrentDevice = autoServiceListResponse?.data?.content?.find(
    (item) => item.device?.id === id,
  );

  const autoServiceType = activeAutoServiceForCurrentDevice?.type;

  // Новый запрос для получения событий автоподбора
  const { data: eventsResponse, refetch: refetchEvents } = useConfiguredQuery(
    [QueryKeys.EVENTS_LIST],
    EventsApi.getEventListForAutoService,
    {
      options: {
        filterOptions: {
          branchId: alcolockResponse?.data?.assignment?.branch?.id,
        },
        searchQuery: undefined,
      } as QueryOptions,
      settings: {
        enabled: !!id && !!alcolockResponse?.data?.assignment?.branch?.id,
      },
    },
  );

  // 👇 Используем локальное состояние вместо переменной
  useEffect(() => {
    if (autoServiceType) {
      setCurrentAutoServiceType(autoServiceType);
    } else {
      setCurrentAutoServiceType(undefined); // Сбрасываем если нет активной заявки
    }
  }, [autoServiceType, id]);

  // 👇 При смене ID принудительно перезапускаем все запросы
  useEffect(() => {
    if (id && id !== prevIdRef.current) {
      refetch();
      refetchEvents();
      refetchAutoServiceList();
    }
  }, [id, refetch, refetchEvents, refetchAutoServiceList]);

  // 👇 ОБНОВЛЯЕМ КОНТЕКСТ СТАТУСОВ С ИСПОЛЬЗОВАНИЕМ НОВОЙ ФУНКЦИИ - ИСПРАВЛЕН БЕСКОНЕЧНЫЙ РЕНДЕР
  const eventsDataRef = useRef<any>();
  useEffect(() => {
    if (eventsResponse?.data && eventsResponse.data !== eventsDataRef.current) {
      eventsDataRef.current = eventsResponse.data;
      updateDeviceStatusFromApiResponse(eventsResponse.data);
    }
  }, [eventsResponse?.data, updateDeviceStatusFromApiResponse]);

  // Предыдущее состояние статуса
  const prevStatusRef = useRef(alcolockResponse?.data?.status);

  // Обработка изменения статуса
  useEffect(() => {
    const currentStatus = alcolockResponse?.data?.status;
    if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
      refetch();
      refetchEvents();
    }

    prevStatusRef.current = currentStatus;
  }, [alcolockResponse?.data?.status, refetch, refetchEvents]);

  // Периодическое обновление данных
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchEvents();
      refetchAutoServiceList(); // 👈 также обновляем список заявок
    }, 10000);

    return () => clearInterval(interval);
  }, [refetch, refetchEvents, refetchAutoServiceList]);

  // Обработка отсутствия алкозамка
  const notFoundAlcolock =
    error?.status === StatusCode.NOT_FOUND || alcolockResponse?.status === StatusCode.NOT_FOUND;

  return {
    alkolock: alcolockResponse?.data,
    events: eventsResponse?.data,
    isLoading,
    notFoundAlcolock,
    refetch,
    refetchEvents,
    autoServiceType: currentAutoServiceType,
  };
};
