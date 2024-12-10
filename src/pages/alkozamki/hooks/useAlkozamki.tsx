import { useState } from 'react';

import { HistoryTypes } from '@entities/events_data';
import { useCloseTab } from '@entities/row_table_info';
import { EventsHistory } from '@features/events_history';
import { QueryKeys } from '@shared/const/storageKeys';
import { testids } from '@shared/const/testid';
import { AlkozamkiInfo } from '@widgets/alkozamki_info';
import { useLocation } from 'react-router-dom';

export const useAlkozamki = () => {
  const {state} = useLocation();
  const [selectedAlcolockId, setSelectedAlcolockId] = useState(state?.selectedId || null);
  const onClickRow = (id: string) => setSelectedAlcolockId(id);
  const handleCloseAside = () => setSelectedAlcolockId(null);
  const closeTabWidthUpdate = useCloseTab(handleCloseAside, [QueryKeys.ALKOLOCK_LIST_TABLE]);
  const tabs = [
    {
      testid: testids.page_alcolocks.alcolocks_widget_info.ALCOLOCKS_WIDGET_INFO_TAB_BUTTON_INFO,
      name: 'ИНФО',
      content: (
        <AlkozamkiInfo closeTab={closeTabWidthUpdate} selectedAlcolockId={selectedAlcolockId} />
      ),
    },
    {
      testid: testids.page_alcolocks.alcolocks_widget_info.ALCOLOCKS_WIDGET_INFO_TAB_BUTTON_HISTORY,
      name: 'ИСТОРИЯ',
      content: <EventsHistory type={HistoryTypes.byAlcolock} alcolockId={selectedAlcolockId} />,
    },
  ];

  return {
    tabs,
    selectedAlcolockId,
    onClickRow,
    handleCloseAside,
  };
};
