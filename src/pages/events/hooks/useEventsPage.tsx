import { useState } from 'react';

import { EventInfo } from '@widgets/events_info';

export const useEventsPage = () => {
  const [selectedEventId, setSelectedEventId] = useState<null | number | string>(null);

  const handleClickRow = (id: string | number) => {
    setSelectedEventId(id);
  };

  const tabs = [
    {
      name: 'Инфо',
      content: <EventInfo selectedEventId={selectedEventId} />,
    },
  ];

  const handleCloseAside = () => setSelectedEventId(null);
  return { selectedEventId, handleCloseAside, handleClickRow, tabs };
};
