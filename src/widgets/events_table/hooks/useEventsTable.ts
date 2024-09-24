import { useState, useEffect } from 'react';

import { eventsFilterPanelStore } from '@features/events_filter_panel';
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

  const { isLoading, data, refetch } = useEventsApi({
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    searchQuery: inputWidthDelay,
    limit: state.pageSize,
    page: state.page,
    filterOptions: {
      users: Formatters.getStringForQueryParams(filters.driverId),
      carsByMake: Formatters.getStringForQueryParams(filters.markCar),
      carsByLicense: Formatters.getStringForQueryParams(filters.gosNumber),
      eventsByType: filters.typeEvent,
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const rows = useGetRows(data?.data?.content);
  const columns = useGetColumns(refetch);
  const totalCount = data?.data?.totalElements;

  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [filters, searchQuery, endDate, startDate]);

  const tableData = {
    totalCount,
    rows,
    columns,
    ...state,
    apiRef,
    changeTableState,
    changeTableSorts,
    isLoading,
    page,
    setPage,
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
