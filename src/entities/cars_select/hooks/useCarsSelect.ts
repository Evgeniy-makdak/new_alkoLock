import { useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useCarListQuery } from '../api/useCarListQuery';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useCarsSelect = (vieBranch = false, branchId?: ID, notInBranch?: ID) => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const onReset = () => {
    setSearchQuery('');
  };

  const { carList, isLoading } = useCarListQuery({
    searchQuery,
    filterOptions: { branchId: branchId, notBranchId: notInBranch },
  });

  const carListMapped = mapOptions(carList, (car) => adapterMapOptions(car, vieBranch));
  return { onChange, onReset, isLoading, carList: carListMapped };
};
