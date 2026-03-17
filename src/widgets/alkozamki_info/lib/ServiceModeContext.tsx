import React, { ReactNode, createContext, useContext, useState } from 'react';

interface ServiceModeContextProps {
  isServiceModeFromAlkolock: boolean;
  setIsServiceModeFromAlkolock: (value: boolean) => void;
  deviceStatuses: string[];
  setDeviceStatuses: (statuses: string[]) => void;
}

const ServiceModeContext = createContext<ServiceModeContextProps | undefined>(undefined);

export const ServiceModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isServiceModeFromAlkolock, setIsServiceModeFromAlkolock] = useState<boolean>(false);
  const [deviceStatuses, setDeviceStatuses] = useState<string[]>([]);

  return (
    <ServiceModeContext.Provider
      value={{
        isServiceModeFromAlkolock,
        setIsServiceModeFromAlkolock,
        deviceStatuses,
        setDeviceStatuses,
      }}>
      {children}
    </ServiceModeContext.Provider>
  );
};

export const useServiceMode = (): ServiceModeContextProps => {
  const context = useContext(ServiceModeContext);
  if (!context) {
    throw new Error('useServiceMode must be used within a ServiceModeProvider');
  }
  return context;
};
