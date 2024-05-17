import type React from 'react';

import { EventsApi } from '@shared/api/baseQuerys';
import { SortTypes, SortsTypes } from '@shared/config/queryParamsEnums';
import type { EventsOptions, IDeviceAction } from '@shared/types/BaseQueryTypes';

export const fetchNewList = (
  setNewData: React.Dispatch<React.SetStateAction<IDeviceAction[]>>,
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
  options?: EventsOptions,
) => {
  return async function (page: number) {
    setIsLoading(true);
    await EventsApi.getEventsHistory({
      ...options,
      page,
      limit: 30,
      order: SortsTypes.desc,
      sortBy: SortTypes.DATE_OCCURRENT,
    })
      .then((data) =>
        setNewData((prev) => {
          const arr = data?.data || [];
          if (arr.length === 0) return prev;
          return [...prev, ...arr];
        }),
      )
      .finally(() => setIsLoading(false));
  };
};
