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

  const filteredAlcolocks = alcolocks.filter(
    (alcolock) =>
      alcolock.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(alcolock.serialNumber).includes(searchQuery),
  );

  const onReset = () => {
    setSearchQuery('');
  };

  const alcolockList = mapOptions(filteredAlcolocks, (alcolock) =>
    adapterMapOptions(alcolock, vieBranch),
  );

  return { onChange, isLoading, onReset, alcolockList };
};
