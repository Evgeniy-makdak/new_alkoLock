import { useState } from 'react';

import { HistoryTypes } from '@entities/events_data';
import { EventsHistory } from '@features/events_history';
import { AutoServiceInfo } from '@widgets/auto_service_info';

export const useAutoService = () => {
  const [selectedItemId, setSelectedItemId] = useState(null);

  const onClickRow = (id: string | number, deviceId: string | number) =>
    setSelectedItemId({ id, deviceId });
  const handleCloseAside = () => setSelectedItemId(null);

  const tabs = [
    {
      name: 'ИНФО',
      content: <AutoServiceInfo selectedId={selectedItemId?.id} />,
    },
    {
      name: 'ИСТОРИЯ',
      content: (
        <EventsHistory type={HistoryTypes.byAlcolock} alcolockId={selectedItemId?.deviceId} />
      ),
    },
  ];

  return {
    selectedItemId,
    tabs,
    onClickRow,
    handleCloseAside,
  };
};
