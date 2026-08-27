import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: {
      selectedId?: ID;
      targetPage?: number;
      returnNavigation?: {
        pathname: string;
        search?: string;
        hash?: string;
        state?: unknown;
      };
      mapReturnContext?: {
        sourceTab?: 'info' | 'history';
        expandedEventId?: ID | null;
      };
    };
  };
  const [selectedUserId, setSelectedUserId] = useState<ID | null>(state?.selectedId ?? null);
  const [targetPageFromNavigation, setTargetPageFromNavigation] = useState<number | null>(
    state?.targetPage ?? null,
  );
  const [returnNavigation, setReturnNavigation] = useState(state?.returnNavigation ?? null);
  const [selectedUserActive, setSelectedUserActive] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(
    state?.mapReturnContext?.sourceTab === 'history' ? 1 : 0,
  );
  const [initialExpandedHistoryEventId, setInitialExpandedHistoryEventId] = useState<ID | null>(
    state?.mapReturnContext?.expandedEventId ?? null,
  );
  /** Пока идёт возврат с карты — не даём таблице авто-закрыть aside. */
  const [preserveAsideFromMapReturn, setPreserveAsideFromMapReturn] = useState(
    () => Boolean(state?.selectedId != null && state?.mapReturnContext),
  );

  useEffect(() => {
    if (state?.selectedId != null) {
      setSelectedUserId(state.selectedId);
    }
    if (state?.targetPage != null) {
      setTargetPageFromNavigation(state.targetPage);
    }
    if (state?.returnNavigation) {
      setReturnNavigation(state.returnNavigation);
    }
    if (state?.mapReturnContext?.sourceTab === 'history') {
      setActiveTab(1);
    }
    if (state?.mapReturnContext?.expandedEventId != null) {
      setInitialExpandedHistoryEventId(state.mapReturnContext.expandedEventId);
    }
    if (state?.selectedId != null && state?.mapReturnContext) {
      setPreserveAsideFromMapReturn(true);
    }
  }, [
    state?.selectedId,
    state?.targetPage,
    state?.returnNavigation,
    state?.mapReturnContext?.expandedEventId,
    state?.mapReturnContext?.sourceTab,
    state?.mapReturnContext,
  ]);

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
    setTargetPageFromNavigation(null);
    setReturnNavigation(null);
    // Подвкладку (Инфо/История) не сбрасываем при смене строки — только при закрытии Aside.
    setInitialExpandedHistoryEventId(null);
    setPreserveAsideFromMapReturn(false);
  };

  const handleCloseAside = () => {
    setSelectedUserId(null);
    setSelectedUserActive(false);
    setTargetPageFromNavigation(null);
    setReturnNavigation(null);
    setActiveTab(0); // Сбрасываем активную вкладку при закрытии
    setInitialExpandedHistoryEventId(null);
    setPreserveAsideFromMapReturn(false);
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
  } = useUsersTable(handleCloseAside, selectedUserId, targetPageFromNavigation, false);

  const onTargetPageApplied = () => {
    setTargetPageFromNavigation(null);
  };

  const handleReturnToOrigin = () => {
    if (!returnNavigation) return;
    navigate(
      `${returnNavigation.pathname}${returnNavigation.search || ''}${returnNavigation.hash || ''}`,
      {
        state: returnNavigation.state,
      },
    );
  };

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
          initialExpandedRowId={initialExpandedHistoryEventId}
          sidePanelMobileFilterUx
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
    targetPageFromNavigation,
    onTargetPageApplied,
    returnNavigation,
    handleReturnToOrigin,
    activeTab,
    handleTabChange,
    handleCloseAside,
    // Возвращаем данные модальных окон
    addModalData,
    deleteUserModalData,
    recoverUserModalData,
    trueDeleteUserModalData,
    preserveAsideFromMapReturn,
  };
};
