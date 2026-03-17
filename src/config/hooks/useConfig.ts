import { useEffect, useState } from 'react';

import { configLoader } from '../configLoader';

interface UseConfigReturn {
  config: {
    apiUrl: string;
    wsUrl: string;
  } | null;
  isLoading: boolean;
  error: Error | null;
  reloadConfig: () => Promise<void>;
}

export const useConfig = (): UseConfigReturn => {
  const [config, setConfig] = useState<UseConfigReturn['config']>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedConfig = await configLoader.loadConfig();
      setConfig(loadedConfig);
    } catch (err) {
      console.error('❌ Ошибка загрузки конфигурации:', err);
      setError(err instanceof Error ? err : new Error('Ошибка загрузки конфигурации'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  return {
    config,
    isLoading,
    error,
    reloadConfig: loadConfig,
  };
};
