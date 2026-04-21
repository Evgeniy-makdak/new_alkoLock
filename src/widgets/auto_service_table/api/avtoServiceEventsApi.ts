/* eslint-disable @typescript-eslint/no-explicit-any */
import { EventsApi } from '@shared/api/baseQuerys';
import { SettingsApi } from '@shared/api/settingsApi';
import { QueryKeys } from '@shared/const/storageKeys';
import { useConfiguredQuery } from '@shared/hooks/useConfiguredQuery';
import type { QueryOptions } from '@shared/types/QueryTypes';

export const useAvtoServiceEventsApi = (options: QueryOptions) => {
  const { data, isLoading, refetch } = useConfiguredQuery(
    [QueryKeys.AUTO_SERVICE_EVENTS_LIST],
    EventsApi.getEventListForAutoService,
    { options, settings: { refetchInterval: 10000 } as any },
  );

  const { data: settingsData } = useConfiguredQuery(
    [QueryKeys.SERVICE_MODE_TIMEOUT_SETTINGS],
    () => SettingsApi.getSettingsById(2),
    { options: { enabled: true } },
  );

  const parsedCurrent = Number(settingsData?.currentValue);
  const parsedDefault = Number(settingsData?.defaultValue);
  const serviceModeTimeoutMinutes = Number.isFinite(parsedCurrent)
    ? parsedCurrent
    : Number.isFinite(parsedDefault)
      ? parsedDefault
      : undefined;

  return { data, isLoading, refetch, serviceModeTimeoutMinutes };
};
