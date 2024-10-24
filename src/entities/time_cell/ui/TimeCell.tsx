import { useEffect, useState } from 'react';

import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import utc from 'dayjs/plugin/utc';

dayjs.extend(duration);
dayjs.extend(utc);

interface TimeCellProps {
  time: Date; // Изменено: теперь time - объект Date
  id: string | number;
  refetch?: () => void;
}

export const TimeCell = ({ time, id, refetch }: TimeCellProps) => {
  const [timeDifference, setTimeDifference] = useState('');

  useEffect(() => {
    if (!time) return;

    // Парсинг time как объекта Date (уже сделано в renderCell)
    const targetTime = dayjs(time).utc();

    const timer = setInterval(() => {
      const now = dayjs().utc();
      const diff = targetTime.diff(now);

      if (diff <= 0) {
        setTimeDifference('');
        refetch && refetch();
        clearInterval(timer);
        return;
      }

      const diffDuration = dayjs.duration(diff);
      const hours = String(diffDuration.hours()).padStart(2, '0');
      const minutes = String(diffDuration.minutes()).padStart(2, '0');
      const seconds = String(diffDuration.seconds()).padStart(2, '0');

      setTimeDifference(`${hours}:${minutes}:${seconds}`);
    }, 15);

    return () => clearInterval(timer);
  }, [time, id]);

  return <>{timeDifference}</>;
};
