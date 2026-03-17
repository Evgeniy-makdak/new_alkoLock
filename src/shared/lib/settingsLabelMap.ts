/**
 * Maps backend setting labels (Russian) to i18n translation keys.
 * Add new mappings when backend returns new parameter labels.
 */
export const SETTINGS_LABEL_MAP: Record<string, string> = {
  'Время ожидания ответа на запрос активации/деактивации сервисного режима':
    'settingsLabels.serviceModeActivationTimeout',
  'Время ожидания просмотра события (история сервисного режима)':
    'settingsLabels.eventViewWaitingTimeServiceModeHistory',
  'Время ожидания просмотра событий': 'settingsLabels.eventViewWaitingTime',
  'Према ожидание': 'settingsLabels.waitingTime',
  'Время ожидания': 'settingsLabels.waitingTime',
  'Период блокировки': 'settingsLabels.blockingPeriod',
};
