import { useState } from 'react';

import type { ID } from '@shared/types/BaseQueryTypes';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useBranchSelectApi } from '../api/useBranchSelectApi';
import { adapterMapOptions } from '../lib/adapterMapOptions';
import { useUsers } from '@pages/users/hooks/useUsers';

export const useBranchSelect = (filter?: ID) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { handleCloseAside } = useUsers();

  const onChange = (value: string) => {
    setSearchQuery(value);
    // window.location.reload();
    handleCloseAside();
  };

  const onReset = () => {
    setSearchQuery('');
  };
  const { branch, isLoading } = useBranchSelectApi({ searchQuery });

  const branchList =
    branch && branch?.content
      ? mapOptions(branch?.content, adapterMapOptions).filter((item) => item.value !== filter)
      : [];

  return { onChange, onReset, isLoading, branchList };
};
