// AlkoContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AlkoContextType {
  alkoId: string | null;
  setAlkoId: (id: string | null) => void;
}

const AlkoContext = createContext<AlkoContextType | undefined>(undefined);

export const AlkoContextProvider = ({ children }: { children: ReactNode }) => {
  const [alkoId, setAlkoId] = useState<string | null>(null);

  return (
    <AlkoContext.Provider value={{ alkoId, setAlkoId }}>
      {children}
    </AlkoContext.Provider>
  );
};

export const useAlkoContext = (): AlkoContextType => {
  const context = useContext(AlkoContext);
  if (!context) {
    throw new Error('useAlkoContext must be used within an AlkoContextProvider');
  }
  return context;
};
