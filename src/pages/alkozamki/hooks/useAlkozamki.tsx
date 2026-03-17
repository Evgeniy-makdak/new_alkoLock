import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { Dayjs } from 'dayjs';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { Values } from '@shared/ui/search_multiple_select';
import { AlkozamkiInfo } from '@widgets/alkozamki_info';

export const useAlkozamki = () => {
  const { t } = useTranslation();
  const { state } = useLocation();
  const [selectedAlcolockId, setSelectedAlcolockId] = useState(state?.selectedId || null);

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

  const onClickRow = (id: string) => setSelectedAlcolockId(id);
  const handleCloseAside = () => {
    setSelectedAlcolockId(null);
    // Сбрасываем фильтры при закрытии aside
    setHistoryFilters({
      typeEventFilters: [],
      startDate: null,
      endDate: null,
    });
  };
  const closeTabWidthUpdate = useCloseTab(handleCloseAside, [QueryKeys.ALKOLOCK_LIST_TABLE]);

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
        />
      ),
    },
  ];

  return {
    tabs,
    selectedAlcolockId,
    onClickRow,
    handleCloseAside,
  };
};
