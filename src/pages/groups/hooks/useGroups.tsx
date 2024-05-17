import { useState } from 'react';

import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { GroupAlcolocksTable } from '@widgets/group_alcolocks_table';
import { GroupCarTable } from '@widgets/group_car_table';
import { GroupUsersTable } from '@widgets/group_users_table';

import { useGroupsApi } from '../api/useGroupsApi';

export const useGroups = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<null | ID>(null);
  const { branch, isLoading } = useGroupsApi(selectedGroupId);
  const onClickRow = (id: string) => setSelectedGroupId(id);

  const onCloseAside = () => {
    setSelectedGroupId(null);
  };
  const tabs = [
    {
      testid: testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_BUTTON,
      name: 'Пользователи',
      content: <GroupUsersTable groupInfo={branch} />,
    },
    {
      testid: testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_ALCOLOCKS_BUTTON,
      name: 'Алкозамки',
      content: <GroupAlcolocksTable groupInfo={branch} />,
    },
    {
      testid: testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_BUTTON,
      name: 'Транспорт',
      content: <GroupCarTable groupInfo={branch} />,
    },
  ];
  return {
    groupName: branch?.name ?? '-',
    selectedGroupId,
    onClickRow,
    onCloseAside,
    tabs,
    isLoading,
  };
};
