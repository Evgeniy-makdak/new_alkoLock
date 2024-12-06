import React, { createContext, useContext } from 'react';

import { useNavBarApi } from './useNavBarApi';

interface CountContextProps {
  length: number | undefined;
}

const CountContext = createContext<CountContextProps>({ length: 0 });

export const CountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { length } = useNavBarApi();

  return <CountContext.Provider value={{ length }}>{children}</CountContext.Provider>;
};

export const useCountContext = () => useContext(CountContext);
