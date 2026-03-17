import React, { ReactNode, createContext, useContext, useState } from 'react';

// Определяем тип для возможных значений фильтра
type StatusFilterType = 'Все' | 'Активные' | 'Неактивные';

// Определяем интерфейс для значений контекста
interface StatusFilterContextType {
  statusFilter: StatusFilterType;
  setStatusFilter: (status: StatusFilterType) => void;
  resetStatusFilter: () => void;
}

// Создаём сам контекст
const StatusFilterContext = createContext<StatusFilterContextType | undefined>(undefined);

// Провайдер контекста
export const StatusFilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('Активные');

  const resetStatusFilter = () => {
    setStatusFilter('Активные');
  };

  return (
    <StatusFilterContext.Provider value={{ statusFilter, setStatusFilter, resetStatusFilter }}>
      {children}
    </StatusFilterContext.Provider>
  );
};

// Хук для использования контекста
export const useStatusFilter = () => {
  const context = useContext(StatusFilterContext);
  if (!context) {
    throw new Error('useStatusFilter must be used within a StatusFilterProvider');
  }
  return context;
};
