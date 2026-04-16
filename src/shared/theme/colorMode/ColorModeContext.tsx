import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';

import { StorageKeys } from '@shared/const/storageKeys';

export type ColorMode = 'light' | 'dark';

export type ColorModePreference = ColorMode | 'auto';

type ColorModeContextValue = {
  mode: ColorMode;
  preference: ColorModePreference;
  setMode: (m: ColorModePreference) => void;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

function readStoredPreference(): ColorModePreference {
  try {
    const v = localStorage.getItem(StorageKeys.COLOR_MODE);
    if (v === 'dark' || v === 'light' || v === 'auto') {
      return v;
    }
  } catch {
    /* ignore */
  }
  return 'auto';
}

export function ColorModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ColorModePreference>(readStoredPreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemPrefersDark(mql.matches);

    // Safari (и некоторые старые браузеры) могут не поддерживать addEventListener на MediaQueryList
    try {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } catch {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  const setMode = useCallback((m: ColorModePreference) => {
    setPreferenceState(m);
    try {
      localStorage.setItem(StorageKeys.COLOR_MODE, m);
    } catch {
      /* ignore */
    }
  }, []);

  const mode: ColorMode =
    preference === 'auto' ? (systemPrefersDark ? 'dark' : 'light') : preference;

  const toggleColorMode = useCallback(() => {
    setPreferenceState((prev) => {
      const next: ColorModePreference =
        prev === 'light' ? 'dark' : prev === 'dark' ? 'auto' : 'light';
      try {
        localStorage.setItem(StorageKeys.COLOR_MODE, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, preference, setMode, toggleColorMode }),
    [mode, preference, setMode, toggleColorMode],
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
