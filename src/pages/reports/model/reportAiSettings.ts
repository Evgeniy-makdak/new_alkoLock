import { create } from 'zustand';

/**
 * Настройки AI-отчётов: API-ключи бесплатных провайдеров и предпочтение.
 * Хранятся в localStorage (не в env), чтобы ключ можно было ввести в рантайме
 * и чтобы работало в production (Electron/Docker), а не только в dev.
 */

export type ReportAiProvider = 'gemini' | 'openrouter';

export type ReportAiSettings = {
  geminiApiKey: string;
  openRouterApiKey: string;
  /** 'auto' — пробуем по порядку: gemini → openrouter → local_fallback. */
  preferredProvider: ReportAiProvider | 'auto';
};

const STORAGE_KEY = 'reports-ai-settings';

const DEFAULT_SETTINGS: ReportAiSettings = {
  geminiApiKey: '',
  openRouterApiKey: '',
  preferredProvider: 'auto',
};

function isProvider(value: unknown): value is ReportAiProvider {
  return value === 'gemini' || value === 'openrouter';
}

function loadSettings(): ReportAiSettings {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReportAiSettings>;
    return {
      geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : '',
      openRouterApiKey: typeof parsed.openRouterApiKey === 'string' ? parsed.openRouterApiKey : '',
      preferredProvider: isProvider(parsed.preferredProvider)
        ? parsed.preferredProvider
        : 'auto',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function persistSettings(settings: ReportAiSettings): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore quota / private mode */
  }
}

type ReportAiSettingsState = ReportAiSettings & {
  setGeminiApiKey: (key: string) => void;
  setOpenRouterApiKey: (key: string) => void;
  setPreferredProvider: (provider: ReportAiProvider | 'auto') => void;
  reset: () => void;
};

export const useReportAiSettings = create<ReportAiSettingsState>((set, get) => ({
  ...loadSettings(),

  setGeminiApiKey: (key) => {
    const next = { ...get(), geminiApiKey: key.trim() };
    set(next);
    persistSettings(next);
  },

  setOpenRouterApiKey: (key) => {
    const next = { ...get(), openRouterApiKey: key.trim() };
    set(next);
    persistSettings(next);
  },

  setPreferredProvider: (provider) => {
    const next = { ...get(), preferredProvider: provider };
    set(next);
    persistSettings(next);
  },

  reset: () => {
    set(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
  },
}));

/** Синхронное чтение настроек вне React (API-слой). */
export function getReportAiSettings(): ReportAiSettings {
  return useReportAiSettings.getState();
}

/** Есть ли хотя бы один ключ для облачного провайдера. */
export function hasAnyReportAiProviderKey(): boolean {
  const s = getReportAiSettings();
  return Boolean(s.geminiApiKey.trim() || s.openRouterApiKey.trim());
}
