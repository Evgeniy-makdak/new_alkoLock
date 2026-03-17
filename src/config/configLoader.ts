/* eslint-disable @typescript-eslint/no-explicit-any */

interface AppConfig {
  /** Базовый URL приложения (без /api). Пример: https://domain.com/ */
  apiUrl: string;
  wsUrl: string;
  [key: string]: string;
}

class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig | null = null;
  private loadingPromise: Promise<AppConfig> | null = null;

  private defaultConfig: AppConfig = {
    apiUrl: 'https://alcolock-test.lsystems.ru/',
    wsUrl: 'wss://alcolock-test.lsystems.ru/ws/websocket',
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
          return this.defaultConfig;
        }
        if (!externalConfig || typeof externalConfig !== 'object') {
          return this.defaultConfig;
        }

        // Мержим с дефолтными значениями (externalConfig перезаписывает defaultConfig)
        const merged = { ...this.defaultConfig, ...externalConfig };
        return merged;
      } else {
        return this.defaultConfig;
      }
    } catch {
      return this.defaultConfig;
    }
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Конфигурация не загружена. Сначала вызовите loadConfig()');
    }
    return this.config;
  }

  /** Сброс конфига для принудительной перезагрузки при следующем loadConfig() */
  reset(): void {
    this.config = null;
    this.loadingPromise = null;
  }

  // Метод для обновления конфигурации (например, из UI)
  updateConfig(newConfig: Partial<AppConfig>): void {
    if (this.config) {
      this.config = { ...this.config, ...newConfig };
    }
  }
}

export const configLoader = ConfigLoader.getInstance();
