import { useState } from 'react';

import { SortTypes, SortsTypes } from '@shared/config/queryParamsEnums';
import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useUserListQuery } from '../api/userListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useUserSelect = (
  vieBranch = false,
  branchId?: ID,
  notInBranch?: ID,
  // TODO => убрать needDriverId когда уберут ID у поля driver в сущности User => user: {driver: {id: ID}}
  needDriverId = false,
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };
  const { data, isLoading } = useUserListQuery({
    searchQuery,
    filterOptions: { branchId: branchId, notBranchId: notInBranch },
    sortBy: SortTypes.USER,
    order: SortsTypes.asc,
  });

  const onReset = () => {
    setSearchQuery('');
  };
  // TODO => убрать needDriverId когда уберут ID у поля driver в сущности User => user: {driver: {id: ID}}
  const driversList = mapOptions(data, (user) => adapterMapOptions(user, vieBranch, needDriverId));

  return { onChange, isLoading, onReset, driversList };
};
