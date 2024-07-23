import { useState } from 'react';

import { attachmentsFilterPanelStore } from '@features/attachments_filter_panel';
import { InputSearchDelay } from '@shared/config/permissionsEnums';
import { StorageKeys } from '@shared/const/storageKeys';
import { useDebounce } from '@shared/hooks/useDebounce';
import { useSavedLocalTableSorts } from '@shared/hooks/useSavedLocalTableSorts';
import { useToggle } from '@shared/hooks/useToggle';
import { Formatters } from '@shared/utils/formatters';

import { useAttachmentsApi } from '../api/attachmentsApi';
import { useGetColumns } from '../lib/getColumns';
import { useGetRows } from '../lib/getRows';
import { useAttachmentsStore } from '../model/attachmentsStore';

export const useAttachmentsTable = () => {
  const [state, apiRef, changeTableState, changeTableSorts] = useSavedLocalTableSorts(
    StorageKeys.ATTACHMENTS_TABLE_SORTS,
  );
  const [selectDeleteAttachment, setSelectDeleteAttachment] = useState<null | {
    id: number;
    text: string;
  }>(null);

  const [openAddAttachModal, toggleAddAttachModal, closeAddAttachModal] = useToggle(false);

  const [input, setInput] = useState('');
  const {
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    startDate,
    openFilters,
    toggleFilters,
  } = useAttachmentsStore();
  const filters = attachmentsFilterPanelStore((state) => state.filters);
  const [searchQuery] = useDebounce(input, InputSearchDelay);

  const { attachmentList, isLoading, refetch } = useAttachmentsApi({
    searchQuery,
    endDate: Formatters.formatToISODate(endDate),
    startDate: Formatters.formatToISODate(startDate),
    page: state.page,
    limit: state.pageSize,
    filterOptions: {
      drivers: Formatters.getStringForQueryParams(filters.driverId),
      cars: Formatters.getStringForQueryParams(filters.carId),
      createLink: Formatters.getStringForQueryParams(filters.createLink),
      alcolock: Formatters.getStringForQueryParams(filters?.alcolocks),
      dateLink: Formatters.getStringForQueryParams(filters?.dateLink),
    },
    sortBy: state?.sortModel[0]?.field,
    order: state?.sortModel[0]?.sort,
  });

  const handleClickDeleteAttachment = (id: number, text: string) => {
    setSelectDeleteAttachment({ id, text });
  };

  const closeDeleteModal = () => {
    setSelectDeleteAttachment(null);
  };

  const rows = useGetRows(attachmentList);
  const headers = useGetColumns(toggleAddAttachModal, handleClickDeleteAttachment, refetch);

  const tableData = {
    ...state,
    apiRef,
    rows,
    headers,
    changeTableState,
    changeTableSorts,
    isLoading,
  };

  const filtersData = {
    changeEndDate,
    changeStartDate,
    clearDates,
    endDate,
    startDate,
    openFilters,
    toggleFilters,
    setInput,
    input,
  };

  const addModalData = {
    closeAddAttachModal,
    toggleAddAttachModal,
    openAddAttachModal,
  };

  const deleteAttachModalData = {
    closeDeleteModal,
    openDeleteModal: !!selectDeleteAttachment,
    selectDeleteAttachment,
  };

  return {
    deleteAttachModalData,
    addModalData,
    tableData,
    filtersData,
  };
};
