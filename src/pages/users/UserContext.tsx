import { FC, ReactNode, createContext, useContext, useState } from 'react';

import { type ID } from '@shared/types/BaseQueryTypes';

type UserContextType = {
  userId: ID | null;
  setUserId: (id: ID | null) => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<ID | null>(null);

  return <UserContext.Provider value={{ userId, setUserId }}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
};
