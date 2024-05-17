import { useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useAlcolockListQuery } from '../api/alcolockListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useAlcolockSelect = (vieBranch = false, branchId?: ID, notInBranch?: ID) => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };
  const { alcolocks, isLoading } = useAlcolockListQuery({
    searchQuery,
    filterOptions: { branchId, notBranchId: notInBranch },
  });
  const onReset = () => {
    setSearchQuery('');
  };

  const alcolockList = mapOptions(alcolocks, (alcolock) => adapterMapOptions(alcolock, vieBranch));
  return { onChange, isLoading, onReset, alcolockList };
};
