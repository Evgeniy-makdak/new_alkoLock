import { useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useBranchSelectApi } from '../api/useBranchSelectApi';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useBranchSelect = (filter?: ID) => {
  const [searchQuery, setSearchQuery] = useState('');

  const onChange = (value: string) => {
    setSearchQuery(value);
  };

  const onReset = () => {
    setSearchQuery('');
  };
  const { branch, isLoading } = useBranchSelectApi({ searchQuery });

  const branchList = branch && branch?.content
    ? mapOptions(branch?.content, adapterMapOptions).filter((item) => item.value !== filter)
    : [];

  return { onChange, onReset, isLoading, branchList };
};
