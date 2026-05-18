import type React from 'react';

import { Dayjs } from 'dayjs';

import { EventsApi } from '@shared/api/baseQuerys';
import { SortTypes } from '@shared/config/queryParamsEnums';
import type { EventsOptions, IDeviceAction } from '@shared/types/BaseQueryTypes';

// @ts-expect-error: временное решение
interface FetchOptions extends EventsOptions {
  eventTypes?: number[];
  startDate?: Dayjs | null; // Разрешаем Dayjs | null
  endDate?: Dayjs | null; // Разрешаем Dayjs | null
  sortField?: 'id' | 'timestamp' | null;
  sortOrder?: 'ASC' | 'DESC' | null;
}

export const fetchNewList = (
  setEventsAcc: React.Dispatch<React.SetStateAction<IDeviceAction[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  options: FetchOptions, // Используем исправленный тип
  pageNum: number = 0,
) => {
  return async function () {
    setIsLoading(true);

    const filterOptions = {
      ...options?.filterOptions,
      eventsByType: options?.eventTypes?.map((value) => ({ value })) || [],
      startDate: options?.startDate ? options.startDate.toISOString() : undefined,
      endDate: options?.endDate ? options.endDate.toISOString() : undefined,
    };

    const hasExplicitSort = options?.sortField != null && options?.sortOrder != null;
    const sortBy = hasExplicitSort
      ? options.sortField === 'id'
        ? SortTypes.ID
        : SortTypes.DATE_OCCURRENT
      : undefined;
    const order = hasExplicitSort ? options.sortOrder!.toLowerCase() : undefined;

    const queryParams = {
      ...options,
      page: pageNum,
      limit: options?.pageSize,
      ...(hasExplicitSort ? { order, sortBy } : {}),
      eventType: options?.eventTypes?.join(','),
      filterOptions,
    };

    try {
      //@ts-expect-error: "Временное решение"
      const data = await EventsApi.getEventsHistory(queryParams);
      setEventsAcc((prev) => {
        // Если это первая страница, заменяем данные, иначе добавляем
        if (pageNum === 0) {
          return data?.data?.content || [];
        } else {
          const arr = data?.data?.content || [];
          return arr.length === 0 ? prev : [...prev, ...arr];
        }
      });
    } finally {
      setIsLoading(false);
    }
  };
};
