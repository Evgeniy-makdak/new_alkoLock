import { useState } from 'react';

import { SortTypes, SortsTypes } from '@shared/config/queryParamsEnums';
import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useUserListQuery } from '../api/userListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useUserSelect = (
  branchId?: ID,
  notInBranch?: ID,
  useUserAttachSort = false, // Добавлен флаг для сортировки
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const { data, isLoading } = useUserListQuery({
    searchQuery,
    filterOptions: { branchId: branchId, notBranchId: notInBranch },
    sortBy: useUserAttachSort ? SortTypes.USER_ATTACH : SortTypes.USER, // Выбор сортировки
    order: SortsTypes.asc,
  });

  const onReset = () => {
    setSearchQuery('');
  };

  // Исключаем пользователя с id = 2
  const filteredData = Array.isArray(data)
    ? data.filter((user) => user.id !== 2)
    : data?.content?.filter((user: { id: number }) => user.id !== 2) || [];

  const driversList = mapOptions(filteredData, adapterMapOptions);

  return { onChange, isLoading, onReset, driversList };
};
