import { useEffect, useState } from 'react';

import { historyFilterPanelStore } from '@features/history_filter_panel';
import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { SortsTypes } from '@shared/config/queryParamsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { Formatters } from '@shared/utils/formatters';

import { useHistoryApi } from '../api/useHistoryApi';
import { ValuesHeader, useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useHistoryStore } from '../model/historyStore';

export const useHistoryTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.HISTORY_TABLE_SORTS,
    [
      {
        field: ValuesHeader.DATE,
        sort: SortsTypes.desc,
      },
    ],
  );

  const newRefetch = async () => {
    refetch();
  };
  const { resetFilters, filters, hasActiveFilters } = historyFilterPanelStore();

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
  } = useHistoryStore();

  const { isLoading, data, refetch } = useHistoryApi({
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    searchQuery: inputWidthDelay,
    limit: state.pageSize,
    page: state.page,
    filterOptions: {
      //@ts-expect-error: "Временное решение"
      alcolocks: Formatters.getStringForQueryParams(filters.alcolocks),
      //@ts-expect-error: "Временное решение"
      typeEvent: filters.typeEvent,
      //@ts-expect-error: "Временное решение"
      driverId: Formatters.getStringForQueryParams(filters.driverId),
      //@ts-expect-error: "Временное решение"
      handlerId: Formatters.getStringForQueryParams(filters.handlerId),
      //@ts-expect-error: "Временное решение"
      carId: Formatters.getStringForQueryParams(filters.carId),
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const rows = useGetRows(data?.data?.content);
  const columns = useGetColumns(refetch, newRefetch);
  const totalCount = data?.data?.totalElements;

  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [filters, searchQuery, endDate, startDate]);

  const handleSetPage = (newPage: number) => {
    setPage(newPage);
    changeTableState({ page: newPage, pageSize: state.pageSize });
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
    page,
    setPage: handleSetPage,
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
