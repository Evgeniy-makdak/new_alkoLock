/** Сущности «Поле результата»: page=0&size=20 и &all.match.contains= при поиске (как алкозамки). */
export const REPORT_SERVER_SEARCH_REFERENCE_ENTITIES = new Set([
  'Vehicle',
  'MonitoringDevice',
  'User',
  'EventsForFront',
  'BranchOffice',
  'DeviceAction',
]);

export function isReportReferenceEntityServerSearch(referenceEntity: string): boolean {
  return REPORT_SERVER_SEARCH_REFERENCE_ENTITIES.has((referenceEntity ?? '').trim());
}
