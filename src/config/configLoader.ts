/* eslint-disable @typescript-eslint/no-explicit-any */
import { setStompDebugFromRuntimeConfig } from '../widgets/chat/lib/stompDebugLog';
import { isElectronChatShell } from '../widgets/chat/chatPopup/chatShellEnvironment';
import { resolveElectronRemoteUiEndpoints } from '../widgets/chat/chatPopup/electronWebSocketUrl';

/**
 * Electron-специфика (подмена apiUrl/wsUrl) включается ТОЛЬКО в Electron-сборке.
 * Обычный `yarn build` / Docker этого флага не ставит → config.json используется как есть.
 */
const isElectronShellBuildEnabled = (): boolean =>
  process.env.REACT_APP_ELECTRON_SHELL === 'true';

function isElectronLocalUiHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveElectronLocalUiEndpoints(): AppConfig | null {
  if (!isElectronShellBuildEnabled()) return null;
  if (typeof window === 'undefined' || !isElectronChatShell()) return null;
  if (!isElectronLocalUiHost(window.location.hostname)) return null;
  const origin = window.location.origin.replace(/\/$/, '');
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return {
    apiUrl: `${origin}/`,
    wsUrl: `${wsProtocol}//${window.location.host}/ws/websocket`,
  };
}

/** Шаблон из config.json: `{DOMAIN}` меняется на этот хост, если в файле не указали свой URL целиком. */
const DEFAULT_APP_DOMAIN_HOST = 'alcolock-test.lsystems.ru';

/** Шаблон из config.json: замените {DOMAIN} на свой хост (или оставьте — подставится тестовый по умолчанию). */
export const CONFIG_DOMAIN_PLACEHOLDER = '{DOMAIN}';
/** @deprecated совместимость со старым шаблоном */
export const CONFIG_URL_PLACEHOLDER = 'YOUR_SERVER_HOST';
/** Порт из бэкенд-шаблона; фронт его не использует (HTTPS идёт через nginx без явного порта). */
export const CONFIG_HTTPS_PORT_PLACEHOLDER = '{EXTERNAL_HTTPS_PORT}';

export interface AppConfig {
  /** Базовый URL приложения (без /api). Пример: https://domain.com/ */
  apiUrl: string;
  wsUrl: string;
  /**
   * Включить логи [Chat/STOMP] в консоли (диагностика WebSocket).
   * В config.json: true или "true". Без .env.
   */
  chatStompDebug?: boolean | string;
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig | null = null;
  private loadingPromise: Promise<AppConfig> | null = null;

  private defaultConfig: AppConfig = {
    apiUrl: `https://${DEFAULT_APP_DOMAIN_HOST}/`,
    wsUrl: `wss://${DEFAULT_APP_DOMAIN_HOST}/ws/websocket`,
  };

  private constructor() {}

  static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  async loadConfig(): Promise<AppConfig> {
    // Если конфиг уже загружен, возвращаем его
    if (this.config) {
      return this.config;
    }

    // Если загрузка уже в процессе, возвращаем промис
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    // Загружаем конфиг
    this.loadingPromise = this.loadConfigInternal();
    const config = await this.loadingPromise;
    this.config = config;
    return config;
  }

  /**
   * Пустая строка → дефолтный полный URL.
   * `https://{DOMAIN}/` и `wss://{DOMAIN}/...` → подстановка defaultDomainHost (можно не менять config при коммитах).
   * Любой другой URL без плейсхолдеров → как в файле (прод).
   */
  private resolvePlaceholders(merged: AppConfig): AppConfig {
    const host = DEFAULT_APP_DOMAIN_HOST;

    const resolveOne = (value: string | undefined, fallback: string): string => {
      if (typeof value !== 'string' || value.trim() === '') return fallback;
      let v = value;
      // Незакрытый :{EXTERNAL_HTTPS_PORT} даёт Invalid URL → axios не шлёт запрос вообще
      if (v.includes(CONFIG_HTTPS_PORT_PLACEHOLDER)) {
        v = v.split(`:${CONFIG_HTTPS_PORT_PLACEHOLDER}`).join('');
        v = v.split(CONFIG_HTTPS_PORT_PLACEHOLDER).join('');
      }
      if (v.includes(CONFIG_DOMAIN_PLACEHOLDER)) {
        v = v.split(CONFIG_DOMAIN_PLACEHOLDER).join(host);
      }
      if (v.includes(CONFIG_URL_PLACEHOLDER)) {
        v = v.split(CONFIG_URL_PLACEHOLDER).join(host);
      }
      return v;
    };

    return {
      ...merged,
      apiUrl: resolveOne(merged.apiUrl, this.defaultConfig.apiUrl),
      wsUrl: resolveOne(merged.wsUrl, this.defaultConfig.wsUrl),
    };
  }

  private async loadConfigInternal(): Promise<AppConfig> {
    try {
      // Путь от корня сайта (config.json в public/). При подпапке — учитываем PUBLIC_URL
      const base = window.location.origin + (process.env.PUBLIC_URL || '');
      let configUrl = `${base.replace(/\/$/, '')}/config.json`;
      if (process.env.NODE_ENV === 'development') {
        configUrl += `?nocache=${Date.now()}`;
      }

      const response = await fetch(configUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (response.ok) {
        const text = await response.text();
        let externalConfig: Partial<AppConfig>;
        try {
          externalConfig = JSON.parse(text) as Partial<AppConfig>;
        } catch {
          setStompDebugFromRuntimeConfig(undefined);
          return this.defaultConfig;
        }
        if (!externalConfig || typeof externalConfig !== 'object') {
          setStompDebugFromRuntimeConfig(undefined);
          return this.defaultConfig;
        }

        // Мержим с дефолтными значениями (externalConfig перезаписывает defaultConfig)
        const merged = { ...this.defaultConfig, ...externalConfig } as AppConfig;
        const resolved = this.resolvePlaceholders(merged);

        // Electron URL-overrides — только в Electron-сборке (REACT_APP_ELECTRON_SHELL=true).
        // Docker / обычный web-build всегда идут строго по config.json.
        let finalConfig = resolved;
        if (isElectronShellBuildEnabled()) {
          const electronLocal = resolveElectronLocalUiEndpoints();
          const electronRemote = resolveElectronRemoteUiEndpoints(resolved);
          if (electronLocal) {
            finalConfig = { ...resolved, ...electronLocal };
          } else if (electronRemote) {
            finalConfig = { ...resolved, ...electronRemote };
          }
        }

        setStompDebugFromRuntimeConfig(finalConfig.chatStompDebug);
        return finalConfig;
      } else {
        setStompDebugFromRuntimeConfig(undefined);
        return this.defaultConfig;
      }
    } catch {
      setStompDebugFromRuntimeConfig(undefined);
      return this.defaultConfig;
    }
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Конфигурация не загружена. Сначала вызовите loadConfig()');
    }
    return this.config;
  }

  isLoaded(): boolean {
    return this.config !== null;
  }

  /** Сброс конфига для принудительной перезагрузки при следующем loadConfig() */
  reset(): void {
    this.config = null;
    this.loadingPromise = null;
    setStompDebugFromRuntimeConfig(undefined);
  }

  // Метод для обновления конфигурации (например, из UI)
  updateConfig(newConfig: Partial<AppConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
      if (Object.prototype.hasOwnProperty.call(newConfig, 'chatStompDebug')) {
        setStompDebugFromRuntimeConfig(this.config.chatStompDebug);
      }
    }
  }
}

export const configLoader = ConfigLoader.getInstance();
