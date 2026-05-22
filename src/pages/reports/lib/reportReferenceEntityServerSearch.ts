/** Сущности «Поле результата», для которых значения подгружаются постранично с поиском на сервере. */
export const REPORT_SERVER_SEARCH_REFERENCE_ENTITIES = new Set([
  'Vehicle',
  'MonitoringDevice',
  'User',
  'EventsForFront',
]);

export function isReportReferenceEntityServerSearch(referenceEntity: string): boolean {
  return REPORT_SERVER_SEARCH_REFERENCE_ENTITIES.has((referenceEntity ?? '').trim());
}
