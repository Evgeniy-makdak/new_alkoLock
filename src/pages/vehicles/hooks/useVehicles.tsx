import { useState } from 'react';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { VehiclesInfo } from '@widgets/vehicles_info';

export const useVehicles = () => {
  const [selectedCarId, setSelectedCarId] = useState(null);

  const onClickRow = (id: string) => setSelectedCarId(id);
  const handleCloseAside = () => setSelectedCarId(null);
  const closeTabWidthUpdate = useCloseTab(handleCloseAside, [QueryKeys.VEHICLES_PAGE_TABLE]);
  const tabs = [
    {
      testid: testids.page_transports.transports_widget_info.TRANSPORTS_WIDGET_INFO_TAB_BUTTON_INFO,
      name: 'ИНФО',
      content: <VehiclesInfo closeTab={closeTabWidthUpdate} selectedCarId={selectedCarId} />,
    },
    {
      testid:
        testids.page_transports.transports_widget_info.TRANSPORTS_WIDGET_INFO_TAB_BUTTON_HISTORY,
      name: 'ИСТОРИЯ',
      content: <EventsHistory type={HistoryTypes.byCar} carId={selectedCarId} />,
    },
  ];
  return {
    onClickRow,
    tabs,
    selectedCarId,
    handleCloseAside,
  };
};
