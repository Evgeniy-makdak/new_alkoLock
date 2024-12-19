import { useEffect, useState } from 'react';
import { EventsApi } from '@shared/api/baseQuerys';

interface EventClass {
    id: number;
    label: string;
  }

export const useEventClasses = () => {
  const [eventClasses, setEventClasses] = useState<{ id: number, label: string }[]>([]);
  const [filteredEventClasses, setFilteredEventClasses] = useState<{ id: number, label: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>(''); // Для хранения ввода пользователя

  useEffect(() => {
    const fetchEventClasses = async () => {
      setLoading(true);
      try {
        const response = await EventsApi.getEventClasses();
        setEventClasses(response.data as unknown as EventClass[]); 
        setFilteredEventClasses(response.data as any as EventClass[]); 
      } catch (error) {
        setError('Ошибка при загрузке уровней');
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
        event.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEventClasses(filtered);
    } else {
      setFilteredEventClasses(eventClasses); // Если нет поиска, показываем все
    }
  }, [searchTerm, eventClasses]);

  return { eventClasses: filteredEventClasses, loading, error, setSearchTerm };
};
