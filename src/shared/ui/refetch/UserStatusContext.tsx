import { ReactNode, createContext, useContext, useState } from 'react';

type UserStatusContextType = {
  isClosed: boolean | null;
  setIsClosed: (value: boolean | null) => void;
};

const UserStatusContext = createContext<UserStatusContextType | undefined>(undefined);

export const UserStatusProvider = ({ children }: { children: ReactNode }) => {
  const [isClosed, setIsClosed] = useState<boolean | null>(null);

  return (
    <UserStatusContext.Provider value={{ isClosed, setIsClosed }}>
      {children}
    </UserStatusContext.Provider>
  );
};

export const useUserStatusContext = () => {
  const context = useContext(UserStatusContext);
  if (!context) {
    throw new Error('useUserStatusContext must be used within a UserStatusProvider');
  }
  return context;
};
