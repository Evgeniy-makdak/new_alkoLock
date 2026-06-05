import type { Values } from '@shared/ui/search_multiple_select';

/** Имя сущности отчёта «Отчёт по событиям» в metadata. */
export const DEVICE_EVENT_REPORT_ENTITY = 'DeviceEvent';
export function isDeviceEventReportEntity(entityName: string): boolean {
  return (entityName ?? '').trim() === DEVICE_EVENT_REPORT_ENTITY;
}

/**
 * @deprecated Справочник пар координат из device-events отключён — слишком тяжёлый запрос.
 * Фильтр «Координаты» использует ручной ввод (ReportCoordinatePairFilterField).
 */
export async function fetchDeviceEventCoordinatePairsForReport(
  _searchQuery?: string,
): Promise<Values> {
  return [];
}
