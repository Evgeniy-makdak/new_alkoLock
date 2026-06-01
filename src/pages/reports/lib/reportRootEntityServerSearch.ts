import type { ReportFieldDefinition } from '../types/reportApiTypes';

/** @deprecated Справочники через доменные API отключены — только metadata отчёта. */
export const REPORT_ROOT_SERVER_SEARCH_ENTITIES = new Set<string>();

export function isReportRootEntityServerSearch(_entityName: string): boolean {
  return false;
}

export function resolveReportRootFieldValueSearchEntity(
  _rootEntityName: string,
  _field: ReportFieldDefinition,
): string | null {
  return null;
}

export function shouldUseReportRootFieldServerSearch(
  _rootEntityName: string,
  _field: ReportFieldDefinition,
): boolean {
  return false;
}
