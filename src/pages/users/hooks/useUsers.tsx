import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dayjs } from 'dayjs';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { appStore } from '@shared/model/app_store/AppStore';
import { type ID } from '@shared/types/BaseQueryTypes';
import { Values } from '@shared/ui/search_multiple_select';
import { UserFoto } from '@widgets/user_foto';
import { UserInfo } from '@widgets/users_info';
import { useUsersTable } from '@widgets/users_table/hooks/useUsersTable';

export const useUsers = () => {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<ID | null>(null);
  const [selectedUserActive, setSelectedUserActive] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(0);

  // Состояние фильтров для вкладки истории
  const [historyFilters, setHistoryFilters] = useState<{
    typeEventFilters: Values;
    startDate: Dayjs | null;
    endDate: Dayjs | null;
  }>({
    typeEventFilters: [],
    startDate: null,
    endDate: null,
  });

  const onClickRow = (id: ID, isActive: boolean) => {
    setSelectedUserId(id);
    setSelectedUserActive(isActive);
  };

  const handleCloseAside = () => {
    setSelectedUserId(null);
    setSelectedUserActive(false);
    setActiveTab(0); // Сбрасываем активную вкладку при закрытии
    // Сбрасываем фильтры при закрытии aside
    setHistoryFilters({
      typeEventFilters: [],
      startDate: null,
      endDate: null,
    });
  };

  const handleTabChange = (index: number) => {
    setActiveTab(index);
  };

  // Получаем данные модальных окон из useUsersTable
  const {
    addModalData,
    deleteUserModalData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recoverUserModalData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    trueDeleteUserModalData,
  } = useUsersTable(handleCloseAside, selectedUserId);

  const closeTabWidthUpdate = useCloseTab(handleCloseAside, [QueryKeys.USER_LIST_TABLE]);
  const hasCreatePermission = appStore().permissions?.includes('PERMISSION_USER_CREATE');

  // Функция для обновления фильтров истории
  const updateHistoryFilters = (filters: {
    typeEventFilters?: Values;
    startDate?: Dayjs | null;
    endDate?: Dayjs | null;
  }) => {
    setHistoryFilters((prev) => ({
      ...prev,
      ...filters,
    }));
  };

  const tabs = [
    {
      testid: testids.page_users.users_widget_info.USERS_WIDGET_INFO_TAB_BUTTON_INFO,
      name: t('info.infoTab'),
      content: <UserInfo closeTab={closeTabWidthUpdate} selectedUserId={selectedUserId} />,
    },

    {
      testid: testids.page_users.users_widget_info.USERS_WIDGET_INFO_TAB_BUTTON_HISTORY,
      name: t('info.historyTab'),
      content: (
        <EventsHistory
          type={HistoryTypes.byUser}
          userId={selectedUserId}
          savedFilters={historyFilters}
          onFiltersChange={updateHistoryFilters}
        />
      ),
    },
    {
      testid: testids.page_users.users_widget_info.USERS_WIDGET_INFO_TAB_BUTTON_PHOTOS,
      name: t('info.galleryTab'),
      disabled: !hasCreatePermission,
      content: <UserFoto userId={selectedUserId} userActive={selectedUserActive} />,
    },
  ];

  return {
    tabs,
    onClickRow,
    selectedUserId,
    activeTab,
    handleTabChange,
    handleCloseAside,
    // Возвращаем данные модальных окон
    addModalData,
    deleteUserModalData,
    recoverUserModalData,
    trueDeleteUserModalData,
  };
};
