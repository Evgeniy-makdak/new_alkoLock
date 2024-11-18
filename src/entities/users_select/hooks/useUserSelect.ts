import { useState } from 'react';

import { SortTypes, SortsTypes } from '@shared/config/queryParamsEnums';
import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useUserListQuery } from '../api/userListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useUserSelect = (
  branchId?: ID,
  notInBranch?: ID,
  useUserAttachSort = false, 
  excludeUserWithId2 = true, 
  onlyWithDriverId = true 
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const { data, isLoading } = useUserListQuery({
    searchQuery,
    filterOptions: { branchId: branchId, notBranchId: notInBranch },
    sortBy: useUserAttachSort ? SortTypes.USER_ATTACH : SortTypes.USER,
    order: SortsTypes.asc,
  });

  const onReset = () => {
    setSearchQuery('');
  };

  const filteredData = Array.isArray(data)
  ? data.filter((user) => {
      // Исключаем только если флаг активен и user.id === 2
      const excludeId2 = excludeUserWithId2 ? user.id !== 2 : true;

      // Фильтруем по driverId только если флаг активен
      const includeWithDriverId = onlyWithDriverId ? user.driverId != null : true;

      return excludeId2 && includeWithDriverId;
    })
  : data?.content?.filter((user: { id: number; driverId?: number }) => {
      const excludeId2 = excludeUserWithId2 ? user.id !== 2 : true;
      const includeWithDriverId = onlyWithDriverId ? user.driverId != null : true;

      return excludeId2 && includeWithDriverId;
    }) || [];


  const driversList = mapOptions(filteredData, adapterMapOptions);
  console.log("Filtered data before mapping:", filteredData);
  console.log("Mapped options:", driversList);
  

  return { onChange, isLoading, onReset, driversList };
};
