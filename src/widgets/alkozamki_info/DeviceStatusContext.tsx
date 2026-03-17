import React, { ReactNode, createContext, useContext, useState } from 'react';

interface DeviceStatusContextProps {
  deviceStatuses: string[];
  deviceIds: number[];
  deviceStatusMap: Map<number, string>; // 👈 добавлена карта статусов
  setDeviceStatuses: (statuses: string[]) => void;
  setDeviceIds: (ids: number[]) => void;
  setDeviceStatusMap: (map: Map<number, string>) => void; // 👈 добавлен сеттер для карты
  // 👇 ДОБАВЛЕНА ФУНКЦИЯ ДЛЯ ОБРАБОТКИ НЕСКОЛЬКИХ ЗАЯВОК
  updateDeviceStatusFromApiResponse: (apiResponse: any) => void;
}

const DeviceStatusContext = createContext<DeviceStatusContextProps | undefined>(undefined);

export const DeviceStatusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [deviceStatuses, setDeviceStatuses] = useState<string[]>([]);
  const [deviceIds, setDeviceIds] = useState<number[]>([]);
  const [deviceStatusMap, setDeviceStatusMap] = useState<Map<number, string>>(new Map()); // 👈 состояние карты

  // 👇 НОВАЯ ФУНКЦИЯ ДЛЯ ОБРАБОТКИ API RESPONSE
  const updateDeviceStatusFromApiResponse = (apiResponse: any) => {
    if (!apiResponse?.content) return;

    const newStatusMap = new Map<number, string>();
    const newDeviceIds: number[] = [];
    const newDeviceStatuses: string[] = [];

    // Обрабатываем все заявки из ответа API
    apiResponse.content.forEach((action: any) => {
      const deviceId = action.device?.id;
      if (!deviceId) return;

      const status = action.status;

      // 👇 КЛЮЧЕВАЯ ЛОГИКА: если для устройства уже есть запись,
      // но текущая заявка имеет статус 'ACTIVE' - перезаписываем на 'ACTIVE'
      const existingStatus = newStatusMap.get(deviceId);

      if (existingStatus) {
        // Если уже есть запись и она 'ACTIVE' - оставляем как есть
        if (existingStatus === 'ACTIVE') {
          return;
        }
        // Если текущая заявка 'ACTIVE' - перезаписываем
        if (status === 'ACTIVE') {
          newStatusMap.set(deviceId, 'ACTIVE');
        }
        // Если обе заявки не 'ACTIVE' - оставляем существующую
      } else {
        // Первая запись для устройства
        newStatusMap.set(deviceId, status);
        newDeviceIds.push(deviceId);
        newDeviceStatuses.push(status);
      }
    });

    setDeviceStatusMap(newStatusMap);
    setDeviceIds(newDeviceIds);
    setDeviceStatuses(newDeviceStatuses);
  };

  return (
    <DeviceStatusContext.Provider
      value={{
        deviceStatuses,
        deviceIds,
        deviceStatusMap, // 👈 передача карты
        setDeviceStatuses,
        setDeviceIds,
        setDeviceStatusMap, // 👈 передача сеттера
        updateDeviceStatusFromApiResponse, // 👈 передача новой функции
      }}>
      {children}
    </DeviceStatusContext.Provider>
  );
};

export const useDeviceStatus = (): DeviceStatusContextProps => {
  const context = useContext(DeviceStatusContext);
  if (!context) {
    throw new Error('useDeviceStatus must be used within a DeviceStatusProvider');
  }
  return context;
};
