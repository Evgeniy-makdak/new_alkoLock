import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { StorageKeys } from '@shared/const/storageKeys';

export type ColorMode = 'light' | 'dark';

type ColorModeContextValue = {
  mode: ColorMode;
  setMode: (m: ColorMode) => void;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function readStoredMode(): ColorMode {
  try {
    const v = localStorage.getItem(StorageKeys.COLOR_MODE);
    if (v === 'dark' || v === 'light') {
      return v;
    }
  } catch {
    /* ignore */
  }
  return 'light';
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ColorMode>(readStoredMode);

  const setMode = useCallback((m: ColorMode) => {
    setModeState(m);
    try {
      localStorage.setItem(StorageKeys.COLOR_MODE, m);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleColorMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const value = useMemo(
    () => ({ mode, setMode, toggleColorMode }),
    [mode, setMode, toggleColorMode],
  );

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return ctx;
}
