/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';

import { appStore } from '@shared/model/app_store/AppStore';
import { Values, mapOptions } from '@shared/ui/search_multiple_select';

import { useTypeEventSelectApi } from '../api/useTypeEventSelectApi';

export const useTypeEventSelect = (
  excludedIds?: number[],
  isIn?: boolean,
  useNewEndpoint: boolean = false,
  levelEvent?: Values,
) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { authId } = appStore();
  const currentBranchId = appStore.getState().selectedBranchState?.id as number;
  const currentUserId = authId ? Number(authId) : undefined;

  // 63 (Слабый выдох) всегда исключаем из фильтра
  const excludedIdsToUse = Array.from(new Set([...(excludedIds ?? []), 63]));

  const { events, isLoading, isError } = useTypeEventSelectApi(
    searchQuery,
    excludedIdsToUse,
    isIn,
    useNewEndpoint,
    levelEvent,
    currentUserId,
    currentBranchId,
  );

  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const onReset = () => {
    setSearchQuery('');
  };

  if (isError) {
    return { marksCarList: [], isLoading, onChange, onReset };
  }

  // Адаптер данных для mapOptions
  const adapter = (data: any): [string, number, Permissions[] | [] | undefined | null] => {
    if (useNewEndpoint) {
      return [data.label, data.id, []];
    } else {
      return [data.label, data.id, []];
    }
  };

  // Приводим данные к массиву и исключаем события по excludedIds (на случай если API не поддерживает фильтр)
  const rawList = Array.isArray(events) ? events : events?.content || [];
  const filteredList = rawList.filter(
    (item: { id?: number }) => !excludedIdsToUse.includes(item.id as number),
  );

  const marksCarList = mapOptions(
    filteredList,
    //@ts-expect-error: "Временное решение"
    adapter,
  );

  return { marksCarList, isLoading, onChange, onReset };
};
