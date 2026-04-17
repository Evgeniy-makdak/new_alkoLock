import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { Dayjs } from 'dayjs';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { ID } from '@shared/types/BaseQueryTypes';
import { Values } from '@shared/ui/search_multiple_select';
import { VehiclesInfo } from '@widgets/vehicles_info';

export const useVehicles = () => {
  const { t } = useTranslation();
  const location = useLocation() as { state?: { selectedId?: ID; targetPage?: number } };
  const selectedIdFromRoute = location.state?.selectedId;
  const targetPageFromRoute = location.state?.targetPage;
  const [selectedCarId, setSelectedCarId] = useState<ID | null>(selectedIdFromRoute ?? null);
  const [targetPageFromNavigation, setTargetPageFromNavigation] = useState<number | null>(
    typeof targetPageFromRoute === 'number' ? targetPageFromRoute : null,
  );

  useEffect(() => {
    if (selectedIdFromRoute != null) {
      setSelectedCarId(selectedIdFromRoute);
    }
    if (typeof targetPageFromRoute === 'number') {
      setTargetPageFromNavigation(targetPageFromRoute);
    }
  }, [selectedIdFromRoute, targetPageFromRoute]);

  // Состояние фильтров для вкладки истории - поднимаем на уровень выше
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
    setSelectedCarId(id);
    setTargetPageFromNavigation(null);
  };
  const onTargetPageApplied = () => {
    setTargetPageFromNavigation(null);
  };
  const handleCloseAside = () => {
    setSelectedCarId(null);
    setTargetPageFromNavigation(null);
    // Сбрасываем фильтры при закрытии aside
    setHistoryFilters({
      typeEventFilters: [],
      startDate: null,
      endDate: null,
    });
  };

  const closeTabWidthUpdate = useCloseTab(handleCloseAside, [QueryKeys.VEHICLES_PAGE_TABLE]);

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
      testid: testids.page_transports.transports_widget_info.TRANSPORTS_WIDGET_INFO_TAB_BUTTON_INFO,
      name: t('info.infoTab'),
      content: <VehiclesInfo closeTab={closeTabWidthUpdate} selectedCarId={selectedCarId} />,
    },
    {
      testid:
        testids.page_transports.transports_widget_info.TRANSPORTS_WIDGET_INFO_TAB_BUTTON_HISTORY,
      name: t('info.historyTab'),
      content: (
        <EventsHistory
          type={HistoryTypes.byCar}
          carId={selectedCarId}
          // Передаем сохраненные фильтры и функцию для их обновления
          savedFilters={historyFilters}
          onFiltersChange={updateHistoryFilters}
        />
      ),
    },
  ];

  return {
    onClickRow,
    tabs,
    selectedCarId,
    targetPageFromNavigation,
    onTargetPageApplied,
    handleCloseAside,
  };
};
