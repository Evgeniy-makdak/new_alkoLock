import type { ReportFieldDefinition } from '../types/reportApiTypes';

import {
  resolveNestedEntityValueLoadKind,
} from './reportNestedEntityValueOptions';

/** Корневые сущности отчёта: справочник «Значение» через API (как nested DeviceEvent → User/ТС/…). */
export const REPORT_ROOT_SERVER_SEARCH_ENTITIES = new Set([
  'User',
  'Vehicle',
  'MonitoringDevice',
  'AutoServiceHistory',
]);

export function isReportRootEntityServerSearch(entityName: string): boolean {
  return REPORT_ROOT_SERVER_SEARCH_ENTITIES.has((entityName ?? '').trim());
}

/** Сущность для fetchReportNestedEntityValueOptions при фильтре по полю корневого отчёта. */
export function resolveReportRootFieldValueSearchEntity(
  rootEntityName: string,
  field: ReportFieldDefinition,
): string | null {
  if (field.referenceEntity?.trim()) {
    return null;
  }
  const root = (rootEntityName ?? '').trim();
  if (!isReportRootEntityServerSearch(root)) {
    return null;
  }
  const kind = resolveNestedEntityValueLoadKind(field, root, field.fieldName);
  if (kind === 'serverSearch' || kind === 'frontDataEnum') {
    return root;
  }
  return null;
}

export function shouldUseReportRootFieldServerSearch(
  rootEntityName: string,
  field: ReportFieldDefinition,
): boolean {
  return resolveReportRootFieldValueSearchEntity(rootEntityName, field) != null;
}
