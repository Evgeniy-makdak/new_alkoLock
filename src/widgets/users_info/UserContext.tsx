import { createContext, useContext, FC, useState, ReactNode } from 'react';
import type { ID } from '@shared/types/BaseQueryTypes';

type UserContextType = {
  selectedUserId: ID | null;
  setSelectedUserId: (id: ID) => void;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  return context;
};

type UserContextProviderProps = {
  children: ReactNode;
};

export const UserContextProvider: FC<UserContextProviderProps> = ({ children }) => {
  const [selectedUserId, setSelectedUserId] = useState<ID | null>(null);

  return (
    <UserContext.Provider value={{ selectedUserId, setSelectedUserId }}>
      {children}
    </UserContext.Provider>
  );
};
