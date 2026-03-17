/* eslint-disable no-console */

/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect, useRef, useState } from 'react';

import { HistoryTypes } from '@entities/events_data';
import { EventsHistory } from '@features/events_history';
import { AutoServiceInfo } from '@widgets/auto_service_info';

export const useAutoService = () => {
  const [selectedItemId, setSelectedItemId] = useState<{
    id: string | number;
    deviceId: string | number;
  } | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState(0); // Индекс активной вкладки
  const isInputFocused = useRef(false);

  const onClickRow = useCallback((id: string | number, deviceId: string | number) => {
    setSelectedItemId({ id, deviceId });
    setActiveTabIndex(0); // При открытии всегда вкладка "ИНФО"
  }, []);

  const handleCloseAside = useCallback(() => {
    setSelectedItemId(null);
    setActiveTabIndex(0);
  }, []);

  const tabs = [
    {
      name: 'ИНФО',
      content: (
        <AutoServiceInfo selectedId={selectedItemId?.id} handleCloseAside={handleCloseAside} />
      ),
    },
    {
      name: 'ИСТОРИЯ',
      content: (
        <EventsHistory
          type={HistoryTypes.byAlcolock}
          alcolockId={selectedItemId?.deviceId}
          serviceRequestId={selectedItemId?.id}
          handleCloseAside={handleCloseAside}
        />
      ),
    },
  ];

  // Обработчик клавиатуры для переключения вкладок
  useEffect(() => {
    if (!selectedItemId) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = event.target as HTMLElement;
      const isInputElement =
        activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

      // Обновляем состояние фокуса
      isInputFocused.current = isInputElement;

      // Если фокус на input или открыто модальное окно - игнорируем навигационные клавиши
      if (isInputElement) {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(event.key)) {
          return;
        }
      }
      if (event.key === 'ArrowRight') {
        setActiveTabIndex((prev) => {
          const newIndex = Math.min(prev + 1, tabs.length - 1);
          return newIndex;
        });
      } else if (event.key === 'ArrowLeft') {
        setActiveTabIndex((prev) => {
          const newIndex = Math.max(prev - 1, 0);
          return newIndex;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItemId, tabs.length]);

  return {
    selectedItemId,
    tabs,
    activeTabIndex,
    onClickRow,
    handleCloseAside,
    setActiveTabIndex, // Для ручного переключения
  };
};
