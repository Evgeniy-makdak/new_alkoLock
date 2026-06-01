/** @deprecated Справочники через доменные API отключены — только metadata отчёта. */
export const REPORT_SERVER_SEARCH_REFERENCE_ENTITIES = new Set<string>();

export function isReportReferenceEntityServerSearch(_referenceEntity: string): boolean {
  return false;
}
