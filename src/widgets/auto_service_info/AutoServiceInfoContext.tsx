import React, { ReactNode, createContext, useContext, useState } from 'react';

interface AutoServiceInfoContextType {
  autoServiceType?: string;
  setAutoServiceType: (type: string) => void;
}

const AutoServiceInfoContext = createContext<AutoServiceInfoContextType>({
  setAutoServiceType: () => {},
});

export const useAutoServiceInfo = () => useContext(AutoServiceInfoContext);

interface AutoServiceInfoProviderProps {
  children: ReactNode;
}

export const AutoServiceInfoProvider: React.FC<AutoServiceInfoProviderProps> = ({ children }) => {
  const [autoServiceType, setAutoServiceType] = useState<string>();

  return (
    <AutoServiceInfoContext.Provider value={{ autoServiceType, setAutoServiceType }}>
      {children}
    </AutoServiceInfoContext.Provider>
  );
};
