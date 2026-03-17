/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';

import { CarsApi } from '@shared/api/baseQuerys';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { useStatusFilter } from '@shared/ui/search_multiple_select/StatusFilterContext';

export const useVehiclesTableApi = (
  options: QueryOptions & {
    forMap?: boolean;
    bounds?: {
      northEastLat?: number;
      northEastLng?: number;
      southWestLat?: number;
      southWestLng?: number;
    };
  },
  isMapPage = false,
) => {
  const { statusFilter } = useStatusFilter();
  const filterKey = statusFilter as any;
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const [pollingEnabled, setPollingEnabled] = useState(true);

  let additionalQuery = '';
  // На вкладке Карта всегда показываем только активные ТС, независимо от statusFilter
  if (options.forMap) {
    additionalQuery = '&all.isActive.in=true';
  } else if (statusFilter === 'Активные') {
    additionalQuery = '&all.isActive.in=true';
  } else if (statusFilter === 'Неактивные') {
    additionalQuery = '&all.isActive.in=false';
  }

  // Добавляем координаты границ, если они есть и это запрос для карты
  if (options.forMap && options.bounds) {
    const { northEastLat, northEastLng, southWestLat, southWestLng } = options.bounds;
    if (northEastLat && northEastLng && southWestLat && southWestLng) {
      additionalQuery += `&all.latitude.lessThanOrEqual=${northEastLat}`;
      additionalQuery += `&all.latitude.greaterThanOrEqual=${southWestLat}`;
      additionalQuery += `&all.longitude.lessThanOrEqual=${northEastLng}`;
      additionalQuery += `&all.longitude.greaterThanOrEqual=${southWestLng}`;
    }
  }

  const modifiedOptions: QueryOptions = {
    ...options,
    query: options.query ? `${options.query}${additionalQuery}` : additionalQuery,
  };

  const hasMapBounds =
    options.forMap &&
    options.bounds &&
    options.bounds.northEastLat &&
    options.bounds.northEastLng &&
    options.bounds.southWestLat &&
    options.bounds.southWestLng;
  const queryEnabled = pollingEnabled && (!options.forMap || !!hasMapBounds);

  const { data, refetch, isLoading } = useConfiguredQuery(
    [
      QueryKeys.VEHICLES_PAGE_TABLE,
      options.forMap ? 'map' : filterKey,
      options.forMap,
      options.bounds,
    ],
    CarsApi.getCarsList,
    {
      options: modifiedOptions,
      settings: {
        enabled: queryEnabled,
        refetchInterval: isMapPage && pollingEnabled ? 10000 : undefined,
        staleTime: isMapPage ? 30000 : 0,
      } as any,
    },
  );

  const stopPolling = () => {
    setPollingEnabled(false);
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const startPolling = () => {
    setPollingEnabled(true);
  };

  useEffect(() => {
    if (isMapPage && pollingEnabled && !pollingRef.current) {
      pollingRef.current = setInterval(() => {
        refetch();
      }, 10000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [isMapPage, pollingEnabled, refetch]);

  return {
    cars: data?.data,
    isLoading,
    refetch,
    stopPolling,
    startPolling,
  };
};
