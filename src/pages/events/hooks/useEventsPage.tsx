import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { EventInfo } from '@widgets/events_info';
import { AdditionInfo } from '@widgets/events_info/ui/AdditionInfo';

export const useEventsPage = () => {
  const { t } = useTranslation();
  const { state } = useLocation() as {
    state?: { selectedEventId?: string | number };
  };
  const [selectedEventId, setSelectedEventId] = useState<null | number | string>(null);
  const [isAsideOpen, setIsAsideOpen] = useState(false);
  const [hasTemperatureSensor, setHasTemperatureSensor] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'additionalData'>('info');

  const handleClickRow = (id: string | number) => {
    setSelectedEventId(id);
    setIsAsideOpen(true);
    setActiveTab('info');
  };

  const handleCloseAside = () => {
    setSelectedEventId(null);
    setIsAsideOpen(false);
    setActiveTab('info');
  };

  useEffect(() => {
    if (state?.selectedEventId != null) {
      setSelectedEventId(state.selectedEventId);
      setIsAsideOpen(true);
      setActiveTab('info');
    }
  }, [state?.selectedEventId]);

  useEffect(() => {
    if (!hasTemperatureSensor && activeTab === 'additionalData') {
      setActiveTab('info');
    }
  }, [hasTemperatureSensor, activeTab]);

  const tabs = [
    {
      name: t('info.infoTab'),
      key: 'info',
      content: (
        <EventInfo
          selectedEventId={selectedEventId}
          onHasTemperatureSensor={setHasTemperatureSensor}
        />
      ),
    },
    ...(hasTemperatureSensor
      ? [
          {
            name: t('info.additionalDataTab'),
            key: 'additionalData',
            content: <AdditionInfo selectedEventId={selectedEventId} />,
          },
        ]
      : []),
  ];

  return {
    selectedEventId,
    handleCloseAside,
    handleClickRow,
    tabs,
    isAsideOpen,
    activeTab,
    setActiveTab,
  };
};
