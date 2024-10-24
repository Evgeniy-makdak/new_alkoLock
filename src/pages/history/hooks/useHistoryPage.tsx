import { useState } from 'react';

import { HistoryInfo } from '@widgets/history_info';

export const useHistoryPage = () => {
  const [selectedHistoryId, setSelectedHistoryId] = useState<null | number | string>(null);

  const handleClickRow = (id: string | number) => {
    setSelectedHistoryId(id);
  };

  const tabs = [
    {
      name: 'Инфо',
      content: <HistoryInfo selectedHistoryId={selectedHistoryId} />,
    },
  ];

  const handleCloseAside = () => setSelectedHistoryId(null);
  return { selectedHistoryId, handleCloseAside, handleClickRow, tabs };
};
