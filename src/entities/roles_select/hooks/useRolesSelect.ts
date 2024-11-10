import { useEffect, useState } from 'react';

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

  useEffect(() => {
    setSelectedRoleIds([]);
  }, [setSelectedRoleIds]);

  useEffect(() => {
    if (selectedRoleIds.length > 0) {
      const selectedRoleIdsString = selectedRoleIds.join(',');
      const fetchRoleData = async () => {
        try {
          const response = await RolesApi.checkDriverRole(selectedRoleIdsString);
          setIsUserDriver(response.data.hasDriverRole);
          onDriverRoleCheck?.(response.data.hasDriverRole);
        } catch (error) {
          console.error('Ошибка проверки роли "Водитель":', error);
        } finally {
          setSelectedRoleIds([]);
        }
      };
      fetchRoleData();
    }
  }, [selectedRoleIds]);

  const onChange = (value: string) => {
    setSearchQuery(value);
    setSelectedRoleIds([value]);
  };

  // const { data, isLoading } = useRolesSelectApi({
  //   searchQuery,
  // });

  const onReset = () => {
    setSearchQuery('');
    setSelectedRoleIds([]);
  };

  const roles = mapOptions(data, (role) => adapterMapOptions(role, notShowGlobalAdminRole));

  return { onChange, isLoading, onReset, roles };
};
