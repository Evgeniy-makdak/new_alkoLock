import { useState } from 'react';

import { mapOptions } from '@shared/ui/search_multiple_select';

import { useRolesSelectApi } from '../api/useRolesSelectApi';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useRolesSelect = (notShowGlobalAdminRole = true) => {
  const [searchQuery, setSearchQuery] = useState('');
  const onChange = (value: string) => {
    setSearchQuery(value);
  };
  const { data, isLoading } = useRolesSelectApi({
    searchQuery,
  });
  const onReset = () => {
    setSearchQuery('');
  };

  const roles = mapOptions(data, (role) => adapterMapOptions(role, notShowGlobalAdminRole));
  return { onChange, isLoading, onReset, roles };
};
