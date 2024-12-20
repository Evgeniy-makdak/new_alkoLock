import { useEffect, useMemo, useState } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { EventsApi } from '@shared/api/baseQuerys';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

export const useGetRows = (data: IDeviceAction[]): GridRowsProp => {
  const [eventClasses, setEventClasses] = useState<string[]>([]);

  useEffect(() => {
    const fetchEventClasses = async () => {
      try {
        const response = await EventsApi.getEventClasses();
        setEventClasses(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке уровней', err);
      }
    };

    fetchEventClasses();
  }, []);

  const mapData = useMemo(() => {
    return (Array.isArray(data) ? data : []).map((item) => {
      const timestamp = typeof item.timestamp === 'string' ? item.timestamp : undefined;
      const typeOfEvent: string = item.eventType;
      const level = eventClasses.find((eventClass) => eventClass === item.level) || '-';

      return {
        id: item.id,
        actionId: item?.action.id,
        [ValuesHeader.DATE_OCCURRENT]: timestamp
          ? (Formatters.formatISODate(timestamp) ?? '-')
          : '-',
        [ValuesHeader.INTITIATOR]: Formatters.nameFormatter(item.userRecord) ?? '-',
        [ValuesHeader.TC]: item.action.vehicleRecord
          ? Formatters.carNameFormatter(item.action.vehicleRecord, false)
          : '-',
        [ValuesHeader.ALCOLOKS]: Formatters.alcolocksFormatter(item.action.device) ?? '-',
        [ValuesHeader.TYPE_OF_EVENT]: typeOfEvent,
        [ValuesHeader.LEVEL]: level, // Новое поле для уровня
      };
    });
  }, [data, eventClasses]); // Добавляем зависимость от eventClasses

  return mapData;
};
