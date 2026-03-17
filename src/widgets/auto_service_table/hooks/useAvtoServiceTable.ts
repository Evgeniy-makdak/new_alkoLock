import { useCallback, useEffect, useState } from 'react';

import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { Formatters } from '@shared/utils/formatters';

import { useAvtoServiceEventsApi } from '../api/avtoServiceEventsApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useAutoServiceStore } from '../model/autoServiceStore';

export const useAvtoServiceTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.AVTO_SERVICE_EVENTS_TABLE_SORTS,
  );
  const [input, setInput] = useState('');
  const { changeEndDate, changeStartDate, clearDates, endDate, startDate } = useAutoServiceStore();
  const [searchQuery] = useDebounce(input, InputSearchDelay);
  const { data, isLoading, refetch, serviceModeTimeoutMinutes } = useAvtoServiceEventsApi({
    searchQuery,
    page: state.page,
    limit: state.pageSize,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });
  const newRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  useEffect(() => {
    const resetFiltersListener = () => {
      setInput('');
      clearDates();
    };
    window.addEventListener('resetFilters', resetFiltersListener);
    return () => window.removeEventListener('resetFilters', resetFiltersListener);
  }, [clearDates]);

  const columns = useGetColumns(refetch, newRefetch, serviceModeTimeoutMinutes);
  const rows = useGetRows(data?.data?.content || []);
  const totalCount = data?.data?.totalElements;

  // Добавляем состояние для управления пагинацией в мобильной версии
  const [page, setPage] = useState(0);

  // Методы для управления пагинацией в мобильной версии
  const changePage = (newPage: number) => {
    changeTableState({ page: newPage, pageSize: state.pageSize });
    setPage(newPage);
  };

  const changePageSize = (newPageSize: number) => {
    changeTableState({ page: 0, pageSize: newPageSize });
    setPage(0);
  };

  const filterData = {
    input,
    setInput,
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    startDate,
  };

  const tableData = {
    ...state,
    totalCount,
    apiRef,
    changeTableState,
    changeTableSorts,
    columns,
    isLoading,
    rows,
    // Добавляем методы для мобильной версии
    page,
    setPage,
    changePage,
    changePageSize,
  };
  return { filterData, tableData, refetch };
};
