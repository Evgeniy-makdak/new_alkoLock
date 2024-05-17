import { useState } from 'react';

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
  const { data, isLoading, refetch } = useAvtoServiceEventsApi({
    searchQuery,
    page: state.page,
    limit: state.pageSize,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });
  const deviceActions = data?.data;
  const columns = useGetColumns(refetch);
  const rows = useGetRows(deviceActions);

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
    apiRef,
    changeTableState,
    changeTableSorts,
    columns,
    isLoading,
    rows,
  };
  return { filterData, tableData };
};
