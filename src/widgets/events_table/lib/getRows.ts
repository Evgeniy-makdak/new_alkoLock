/* eslint-disable no-console */
import { useEffect, useMemo, useState } from 'react';

import type { GridRowsProp } from '@mui/x-data-grid';

import { EventsApi } from '@shared/api/baseQuerys';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { ValuesHeader } from './getColumns';

interface TableRow {
  id: string;
  actionId?: string;
  isProcessing?: boolean;
  [ValuesHeader.DATE_OCCURRENT]: string;
  [ValuesHeader.INTITIATOR]: string;
  [ValuesHeader.TC]: string;
  [ValuesHeader.ALCOLOKS]: string;
  alcoteks?: string;
  [ValuesHeader.TYPE_OF_EVENT]: string;
  [ValuesHeader.LEVEL]: string;
  createdBy?: string;
  dateOccurrent?: string;
  rawDate?: string; // Добавляем raw дату для мобильной версии
}

export const useGetRows = (data: IDeviceAction[]): GridRowsProp<TableRow> => {
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
    return (Array.isArray(data) ? data : []).map((item: IDeviceAction) => {
      const timestamp = typeof item.timestamp === 'string' ? item.timestamp : undefined;

      // Определяем тип события - БЕРЕМ ИЗ НОВОГО ПОЛЯ eventsForFront
      const typeOfEvent: string = item.eventsForFront?.label || '-';

      // Определяем уровень - используем старую логику с eventClasses
      const level = eventClasses.find((eventClass) => eventClass === item.level) || '-';

      const isProcessing =
        item.vehicleAction?.inProcessing ||
        item.action?.inProcessing ||
        item.user?.inProcessing ||
        false;

      // Для новой структуры: deviceRecord вместо action.device
      // Получаем устройство из нового или старого поля
      let device = item.device;
      if (!device && item.action?.device) {
        device = item.action.device;
      }
      // Дополнительно проверяем deviceRecord для новой структуры
      if (!device && item.deviceRecord) {
        // Создаем объект устройства из deviceRecord для совместимости
        device = {
          name: item.deviceRecord.name,
          serialNumber: item.deviceRecord.serialNumber,
        } as any;
      }

      // Для инициатора: используем userRecord для новой структуры
      let user = item.user;
      if (!user && item.userRecord) {
        // Создаем объект пользователя из userRecord для совместимости
        user = {
          firstName: item.userRecord.firstName,
          surname: item.userRecord.surname,
          middleName: item.userRecord.middleName,
          email: item.userRecord.email,
        } as any;
      }

      // Для ТС: vehicleRecord для новой структуры
      let vehicleRecord = item.action?.vehicleRecord;
      if (!vehicleRecord && item.vehicleRecord) {
        vehicleRecord = item.vehicleRecord;
      }

      // Форматируем данные для мобильной версии
      const formattedDate = timestamp ? (Formatters.formatISODate(timestamp) ?? '-') : '-';

      // Форматируем инициатора - используем обновленный user
      const formattedInitiator = user ? (Formatters.nameFormatter(user) ?? '-') : '-';

      // Форматируем алкозамок - используем обновленный device
      const formattedAlcolock = device ? (Formatters.alcolocksFormatter(device) ?? '-') : '-';

      // Получаем actionId - для новой структуры он в корне, для старой в action.id
      const actionId = item.actionId || item.action?.id;

      return {
        id: item.id.toString(),
        actionId: actionId?.toString(),
        isProcessing,
        [ValuesHeader.DATE_OCCURRENT]: formattedDate,
        [ValuesHeader.INTITIATOR]: formattedInitiator,
        [ValuesHeader.TC]: vehicleRecord ? Formatters.carNameFormatter(vehicleRecord, false) : '-',
        [ValuesHeader.ALCOLOKS]: formattedAlcolock,
        [ValuesHeader.TYPE_OF_EVENT]: typeOfEvent,
        [ValuesHeader.LEVEL]: level,
        // Дополнительные поля для мобильной версии
        alcoteks: formattedAlcolock,
        createdBy: formattedInitiator,
        dateOccurrent: formattedDate,
        // Сохраняем raw дату для корректного форматирования
        rawDate: timestamp,
      };
    });
  }, [data, eventClasses]);

  return mapData;
};
