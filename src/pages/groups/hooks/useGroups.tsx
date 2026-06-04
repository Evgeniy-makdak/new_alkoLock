import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { testids } from '@shared/const/testid';
import type { ID } from '@shared/types/BaseQueryTypes';
import { GroupAlcolocksTable } from '@widgets/group_alcolocks_table';
import { GroupCarTable } from '@widgets/group_car_table';
import { GroupUsersTable } from '@widgets/group_users_table';

import { useGroupsApi } from '../api/useGroupsApi';

export const useGroups = () => {
  const { t } = useTranslation();
  const [selectedGroupId, setSelectedGroupId] = useState<null | ID>(null);
  const { branch, isLoading } = useGroupsApi(selectedGroupId);
  const onClickRow = (id: string) => setSelectedGroupId(id);

  const onCloseAside = () => {
    setSelectedGroupId(null);
  };

  useEffect(() => {
    if (selectedGroupId && !isLoading && !branch) {
      onCloseAside();
    }
  }, [selectedGroupId, isLoading, branch]);
  const tabs = branch
    ? [
        {
          testid: testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_BUTTON,
          name: t('groups.usersTab'),
          content: <GroupUsersTable groupInfo={branch} />,
        },
        {
          testid: testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_ALCOLOCKS_BUTTON,
          name: t('groups.alcolocksTab'),
          content: <GroupAlcolocksTable groupInfo={branch} />,
        },
        {
          testid: testids.page_groups.groups_widget_info.GROUPS_WIDGET_INFO_TAB_USERS_BUTTON,
          name: t('groups.transportTab'),
          content: <GroupCarTable groupInfo={branch} />,
        },
      ]
    : [];
  return {
    groupName: branch?.name ?? '-',
    branch,
    selectedGroupId,
    onClickRow,
    onCloseAside,
    tabs,
    isLoading,
  };
};
