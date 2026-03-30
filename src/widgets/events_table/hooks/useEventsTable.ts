/* eslint-disable no-console */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';

import { eventsFilterPanelStore } from '@features/events_filter_panel';
import { UsersApi } from '@shared/api/baseQuerys';
import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { SortsTypes } from '@shared/config/queryParamsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { Formatters } from '@shared/utils/formatters';

import { useEventsApi } from '../api/useEventsApi';
import { ValuesHeader, useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useEventsStore } from '../model/eventsStore';
import { useDeviceEventsNewRowsHighlight } from './useDeviceEventsNewRowsHighlight';

export const useEventsTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.EVENTS_TABLE_SORTS,
    [
      {
        field: ValuesHeader.DATE_OCCURRENT,
        sort: SortsTypes.desc,
      },
    ],
  );

  const { resetFilters, filters, hasActiveFilters } = eventsFilterPanelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [inputWidthDelay] = useDebounce(searchQuery, InputSearchDelay);
  const {
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    openFilters,
    startDate,
    toggleFilters,
  } = useEventsStore();

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [permission, setPermission] = useState<string[]>([]);
  const [role, setRole] = useState<string[]>([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await UsersApi.getInfo();
        const roles =
          response.data?.groupMembership?.map((membership: any) => membership.group?.id) || [];
        setPermission(response.data?.permissions || []);
        setCurrentUserId(Number(response.data?.id) || null);
        setRole(roles);
      } catch (error) {
        console.error('Ошибка получения данных пользователя:', error);
      }
    };

    fetchUserData();
  }, []);

  const queryOptions = {
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    searchQuery: inputWidthDelay,
    limit: state.pageSize,
    page: state.page,
    filterOptions: {
      users: Formatters.getStringForQueryParams(filters.driverId),
      cars: Formatters.getStringForQueryParams(filters.carId),
      alcolock: Formatters.getStringForQueryParams(filters?.alcolocks),
      eventsByType: filters.typeEvent,
      level: filters.level,
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
    currentUserId,
    permission,
    role,
  };
  const newRefetch = async () => {
    refetch();
  };

  const { isLoading, data, refetch } = useEventsApi(queryOptions);

  const highlightBaselineKey = useMemo(
    () =>
      JSON.stringify({
        page: state.page,
        pageSize: state.pageSize,
        sortModel: state.sortModel,
        startDate: queryOptions.startDate,
        endDate: queryOptions.endDate,
        search: inputWidthDelay,
        users: queryOptions.filterOptions.users,
        cars: queryOptions.filterOptions.cars,
        alcolock: queryOptions.filterOptions.alcolock,
        eventsByType: queryOptions.filterOptions.eventsByType,
        level: queryOptions.filterOptions.level,
        currentUserId,
        permission,
        role,
      }),
    [
      state.page,
      state.pageSize,
      state.sortModel,
      queryOptions.startDate,
      queryOptions.endDate,
      inputWidthDelay,
      queryOptions.filterOptions.users,
      queryOptions.filterOptions.cars,
      queryOptions.filterOptions.alcolock,
      queryOptions.filterOptions.eventsByType,
      queryOptions.filterOptions.level,
      currentUserId,
      permission,
      role,
    ],
  );

  const highlightedEventIds = useDeviceEventsNewRowsHighlight(
    data?.data?.content,
    highlightBaselineKey,
    isLoading,
  );

  const rows = useGetRows(data?.data?.content);
  const columns = useGetColumns(refetch, newRefetch);
  const totalCount = data?.data?.totalElements;
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [filters, searchQuery, endDate, startDate]);

  // Методы для управления пагинацией в мобильной версии
  const changePage = (newPage: number) => {
    changeTableState({ page: newPage, pageSize: state.pageSize });
    setPage(newPage);
  };

  const changePageSize = (newPageSize: number) => {
    changeTableState({ page: 0, pageSize: newPageSize });
    setPage(0);
  };

  const tableData = {
    totalCount,
    rows,
    columns,
    ...state,
    apiRef,
    changeTableState,
    changeTableSorts,
    isLoading,
    highlightedEventIds,
    page,
    setPage,
    // Добавляем методы для мобильной версии
    changePage,
    changePageSize,
  };

  const filtersData = {
    hasActiveFilters,
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    openFilters,
    startDate,
    toggleFilters,
    input: searchQuery,
    setInput: setSearchQuery,
    resetFilters,
  };

  return {
    filtersData,
    tableData,
  };
};
