import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Dayjs } from 'dayjs';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { Values } from '@shared/ui/search_multiple_select';
import { VehiclesInfo } from '@widgets/vehicles_info';

export const useVehicles = () => {
  const { t } = useTranslation();
  const [selectedCarId, setSelectedCarId] = useState(null);

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

  const onClickRow = (id: string) => setSelectedCarId(id);
  const handleCloseAside = () => {
    setSelectedCarId(null);
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
      name: 'ИНФО',
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
    handleCloseAside,
  };
};
