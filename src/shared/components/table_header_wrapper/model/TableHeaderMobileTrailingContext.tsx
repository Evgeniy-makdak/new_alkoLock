import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

type TableHeaderMobileTrailingContextValue = {
  trailing: ReactNode | null;
  setTrailing: (node: ReactNode | null) => void;
};

const TableHeaderMobileTrailingContext =
  createContext<TableHeaderMobileTrailingContextValue | null>(null);

export function TableHeaderMobileTrailingProvider({ children }: { children: ReactNode }) {
  const [trailing, setTrailingState] = useState<ReactNode | null>(null);
  const setTrailing = useCallback((node: ReactNode | null) => {
    setTrailingState(node);
  }, []);

  const value = useMemo(() => ({ trailing, setTrailing }), [trailing, setTrailing]);

  return (
    <TableHeaderMobileTrailingContext.Provider value={value}>
      {children}
    </TableHeaderMobileTrailingContext.Provider>
  );
}

export function useTableHeaderMobileTrailing() {
  return useContext(TableHeaderMobileTrailingContext);
}
