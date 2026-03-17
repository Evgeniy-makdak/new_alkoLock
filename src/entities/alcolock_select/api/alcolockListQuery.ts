import { useLocation } from 'react-router-dom';

import { AlcolocksApi, CarsApi } from '@shared/api/baseQuerys';
import { RoutePaths } from '@shared/config/routePathsEnum';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useAlcolockListQuery = (options: QueryOptions) => {
  const location = useLocation();
  const pathName = location.pathname as RoutePaths;

  // Определяем параметры запроса в зависимости от пути
  const getQueryParams = (path: RoutePaths) => {
    if (path === RoutePaths.attachments) {
      return {
        excludeAlcolockId: 3,
        excludeType: 'all',
        isAttachment: true,
      };
    }
    if (path === RoutePaths.events) {
      return { includeAlcolockId: 3 };
    }
    if (path === RoutePaths.groups) {
      return { excludeAlcolockId: 3, excludeType: 'all' };
    }
    if (path === RoutePaths.historyAutoService) {
      return { excludeAlcolockId: 3, excludeType: 'all' };
    }
    if (path === RoutePaths.map) {
      return {
        includeActiveOnly: true,
        filterByVehicleBinding: true,
      };
    }
    return {};
  };

  const queryParams = getQueryParams(pathName);
  const { filterByVehicleBinding: filterByVehicleBindingFlag = false, ...alcolockApiParams } =
    queryParams;
  const filterByVehicleBinding = !!filterByVehicleBindingFlag;
  const branchId = options?.filterOptions?.branchId;

  // Для Карты с фильтром по ТС: сначала получаем totalElements, затем загружаем все алкозамки
  const alcolocksCountQuery = useConfiguredQuery(
    [QueryKeys.ALCOLOCK_LIST, 'count', pathName.toString() as any],
    AlcolocksApi.getList,
    {
      options: {
        ...options,
        ...alcolockApiParams,
        page: 0,
        limit: 1,
      },
      settings: { enabled: filterByVehicleBinding },
      triggerOnBranchChange: true,
    },
  );

  const alcolocksTotalElements = alcolocksCountQuery.data?.data?.totalElements ?? 0;

  const alcolocksQuery = useConfiguredQuery(
    [QueryKeys.ALCOLOCK_LIST, pathName.toString() as any],
    AlcolocksApi.getList,
    {
      options: {
        ...options,
        ...alcolockApiParams,
        page: 0,
        limit: filterByVehicleBinding ? alcolocksTotalElements : undefined,
      },
      settings: {
        enabled: !filterByVehicleBinding || alcolocksTotalElements > 0,
      },
      triggerOnBranchChange: true,
    },
  );

  const vehiclesCountQuery = useConfiguredQuery(
    [QueryKeys.CAR_LIST, 'for-alcolock-filter-count', pathName.toString() as any],
    CarsApi.getCarsList,
    {
      options: {
        page: 0,
        limit: 1,
        filterOptions: { branchId, notBranchId: options?.filterOptions?.notBranchId },
        isActive: true,
        specified: true,
      },
      settings: { enabled: filterByVehicleBinding },
      triggerOnBranchChange: true,
    },
  );

  const totalElements = vehiclesCountQuery.data?.data?.totalElements ?? 0;

  const vehiclesQuery = useConfiguredQuery(
    [QueryKeys.CAR_LIST, 'for-alcolock-filter', pathName.toString() as any],
    CarsApi.getCarsList,
    {
      options: {
        page: 0,
        limit: totalElements,
        filterOptions: { branchId, notBranchId: options?.filterOptions?.notBranchId },
        isActive: true,
        specified: true,
      },
      settings: {
        enabled: filterByVehicleBinding && totalElements > 0,
      },
      triggerOnBranchChange: true,
    },
  );

  const alcolocks = alcolocksQuery.data?.data?.content || [];
  const vehicles = filterByVehicleBinding ? vehiclesQuery.data?.data?.content || [] : [];
  const isLoading =
    alcolocksQuery.isLoading ||
    (filterByVehicleBinding &&
      (alcolocksCountQuery.isLoading ||
        vehiclesCountQuery.isLoading ||
        (totalElements > 0 && vehiclesQuery.isLoading)));

  const serialNumbersOnVehicles = new Set(
    vehicles
      .filter((v) => v?.monitoringDevice?.serialNumber)
      .map((v) => String(v.monitoringDevice.serialNumber)),
  );

  const filteredAlcolocks = filterByVehicleBinding
    ? alcolocks.filter((a) => serialNumbersOnVehicles.has(String(a?.serialNumber ?? '')))
    : alcolocks;

  // Для Карты: выводим максимум 20 позиций в выпадающий список
  const displayAlcolocks =
    filterByVehicleBinding && filteredAlcolocks.length > 20
      ? filteredAlcolocks.slice(0, 20)
      : filteredAlcolocks;

  return { alcolocks: displayAlcolocks, isLoading };
};
