/* eslint-disable @typescript-eslint/no-explicit-any */

/* eslint-disable no-console */

/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useState } from 'react';

import { useUserRolesStore } from '@features/user_add_change_form/userRolesStore';
import { RolesApi } from '@shared/api/baseQuerys';
import { mapOptions } from '@shared/ui/search_multiple_select';

import { useRolesSelectApi } from '../api/useRolesSelectApi';
import { adapterMapOptions } from '../lib/adapterMapOptions';

export const useRolesSelect = (
  notShowGlobalAdminRole = true,
  onDriverRoleCheck?: (hasDriverRole: boolean) => void,
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { selectedRoleIds, setSelectedRoleIds } = useUserRolesStore();
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [isUserDriver, setIsUserDriver] = useState<boolean>(false);

  const { data, isLoading } = useRolesSelectApi({
    searchQuery,
  });

  const checkDriverRole = useCallback(
    async (ids: string[]) => {
      try {
        const response = await RolesApi.checkDriverRole(ids.join(','));
        setIsUserDriver(response.data.hasDriverRole);
        onDriverRoleCheck?.(response.data.hasDriverRole);
      } catch (error) {
        console.error('Ошибка проверки роли "Водитель":', error);
      } finally {
        setSelectedRoleIds([]);
      }
    },
    [onDriverRoleCheck, setSelectedRoleIds],
  );

  useEffect(() => {
    setSelectedRoleIds([]);
  }, [setSelectedRoleIds]);

  useEffect(() => {
    if (selectedRoleIds.length > 0) {
      checkDriverRole(selectedRoleIds);
    }
  }, [selectedRoleIds, checkDriverRole]);

  const onChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setSelectedRoleIds([value]);
    },
    [setSelectedRoleIds],
  );

  const onReset = useCallback(() => {
    setSearchQuery('');
    setSelectedRoleIds([]);
  }, [setSelectedRoleIds]);
  const roles = mapOptions(data, (role: any) => adapterMapOptions(role, notShowGlobalAdminRole));

  return {
    onChange,
    isLoading,
    onReset,
    roles,
  };
};
