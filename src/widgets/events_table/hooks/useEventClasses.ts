/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

import { EventsApi } from '@shared/api/baseQuerys';

interface EventClass {
  id: number;
  label: string;
}

function toEventClassList(raw: unknown): EventClass[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (typeof first === 'string') {
    return (raw as string[]).map((label, index) => ({ id: index, label }));
  }
  if (first != null && typeof first === 'object' && 'label' in first) {
    return (raw as { id?: number; label: string }[]).map((item, index) => ({
      id: typeof item.id === 'number' ? item.id : index,
      label: item.label,
    }));
  }
  return [];
}

export const useEventClasses = () => {
  const [eventClasses, setEventClasses] = useState<{ id: number; label: string }[]>([]);
  const [filteredEventClasses, setFilteredEventClasses] = useState<{ id: number; label: string }[]>(
    [],
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); // Для хранения ввода пользователя

  useEffect(() => {
    const fetchEventClasses = async () => {
      setLoading(true);
      try {
        const response = await EventsApi.getEventClasses();
        const list = toEventClassList(response?.data);
        setEventClasses(list);
        setFilteredEventClasses(list);
      } catch (error) {
        setError('Ошибка при загрузке уровней');
        setEventClasses([]);
        setFilteredEventClasses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEventClasses();
  }, []);

  useEffect(() => {
    // Фильтрация по поисковому запросу
    if (searchTerm) {
      const filtered = eventClasses.filter((event) =>
        event.label.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredEventClasses(filtered);
    } else {
      setFilteredEventClasses(eventClasses); // Если нет поиска, показываем все
    }
  }, [searchTerm, eventClasses]);

  return { eventClasses: filteredEventClasses, loading, error, setSearchTerm };
};
