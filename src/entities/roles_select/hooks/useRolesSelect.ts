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
console.log('isLoading:' ,isLoading);

  const roles = mapOptions(data, (role) => adapterMapOptions(role, notShowGlobalAdminRole));
  console.log('roles:' ,roles);
  console.log('data:' ,data);
  return { onChange, isLoading, onReset, roles };
};
