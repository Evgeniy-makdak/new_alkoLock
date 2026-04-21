import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Dayjs } from 'dayjs';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { Values } from '@shared/ui/search_multiple_select';
import { AlkozamkiInfo } from '@widgets/alkozamki_info';

export const useAlkozamki = () => {
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
  const [selectedAlcolockId, setSelectedAlockId] = useState<ID | null>(state?.selectedId ?? null);
  const [targetPageFromNavigation, setTargetPageFromNavigation] = useState<number | null>(
    state?.targetPage ?? null,
  );
  const [returnNavigation, setReturnNavigation] = useState(state?.returnNavigation ?? null);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>(
    state?.mapReturnContext?.sourceTab === 'history' ? 'history' : 'info',
  );
  const [initialExpandedHistoryEventId, setInitialExpandedHistoryEventId] = useState<ID | null>(
    state?.mapReturnContext?.expandedEventId ?? null,
  );

  useEffect(() => {
    if (state?.selectedId != null) {
      setSelectedAlockId(state.selectedId);
    }
    if (state?.targetPage != null) {
      setTargetPageFromNavigation(state.targetPage);
    }
    if (state?.returnNavigation) {
      setReturnNavigation(state.returnNavigation);
    }
    if (state?.mapReturnContext?.sourceTab === 'history') {
      setActiveTab('history');
    }
    if (state?.mapReturnContext?.expandedEventId != null) {
      setInitialExpandedHistoryEventId(state.mapReturnContext.expandedEventId);
    }
  }, [
    state?.selectedId,
    state?.targetPage,
    state?.returnNavigation,
    state?.mapReturnContext?.expandedEventId,
    state?.mapReturnContext?.sourceTab,
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

  const onClickRow = (id: ID) => {
    setSelectedAlockId(id);
    setTargetPageFromNavigation(null);
    setReturnNavigation(null);
    setActiveTab('info');
    setInitialExpandedHistoryEventId(null);
  };
  const handleCloseAside = () => {
    setSelectedAlockId(null);
    setTargetPageFromNavigation(null);
    setReturnNavigation(null);
    setActiveTab('info');
    setInitialExpandedHistoryEventId(null);
    // Сбрасываем фильтры при закрытии aside
    setHistoryFilters({
      typeEventFilters: [],
      startDate: null,
      endDate: null,
    });
  };
  const closeTabWidthUpdate = useCloseTab(handleCloseAside, [QueryKeys.ALKOLOCK_LIST_TABLE]);

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

  // Эффект для скролла к выбранному элементу (если он в DOM)
  useEffect(() => {
    if (selectedAlcolockId) {
      const element = document.querySelector(`[data-row-id="${selectedAlcolockId}"]`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedAlcolockId]);

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
      testid: testids.page_alcolocks.alcolocks_widget_info.ALCOLOCKS_WIDGET_INFO_TAB_BUTTON_INFO,
      name: t('info.infoTab'),
      content: (
        <AlkozamkiInfo closeTab={closeTabWidthUpdate} selectedAlcolockId={selectedAlcolockId} />
      ),
    },
    {
      testid: testids.page_alcolocks.alcolocks_widget_info.ALCOLOCKS_WIDGET_INFO_TAB_BUTTON_HISTORY,
      name: t('info.historyTab'),
      content: (
        <EventsHistory
          type={HistoryTypes.byAlcolock}
          alcolockId={selectedAlcolockId}
          savedFilters={historyFilters}
          onFiltersChange={updateHistoryFilters}
          initialExpandedRowId={initialExpandedHistoryEventId}
          sidePanelMobileFilterUx
        />
      ),
    },
  ];

  return {
    tabs,
    selectedAlcolockId,
    targetPageFromNavigation,
    returnNavigation,
    activeTab,
    setActiveTab,
    handleReturnToOrigin,
    onTargetPageApplied,
    onClickRow,
    handleCloseAside,
  };
};
