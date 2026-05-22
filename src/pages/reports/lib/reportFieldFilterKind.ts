import type { ReportFieldDefinition } from '../types/reportApiTypes';

/** Год выпуска и т.п. — только год (число), не Instant/датапикер. */
export function isReportYearOnlyField(field: ReportFieldDefinition): boolean {
  const type = (field.type ?? '').toUpperCase();
  if (type === 'YEAR') return true;
  const name = field.fieldName.toLowerCase();
  return name === 'year' || name.endsWith('.year');
}

/** Только время суток (LOCAL_TIME), без полной даты. */
export function isReportTimeOnlyField(field: ReportFieldDefinition): boolean {
  const type = (field.type ?? '').toUpperCase();
  if (type === 'LOCAL_TIME' || type === 'TIME') return true;
  if (type.includes('TIME') && !type.includes('DATE') && !type.includes('STAMP')) {
    return true;
  }
  return false;
}

/** Полная дата-время (Instant на бэкенде). */
export function isReportDateTimeField(field: ReportFieldDefinition): boolean {
  if (isReportYearOnlyField(field)) {
    return false;
  }
  const type = (field.type ?? '').toUpperCase();
  if (type.includes('TIMESTAMP') || type.includes('DATETIME') || type.includes('INSTANT')) {
    return true;
  }
  const name = field.fieldName.toLowerCase();
  return name.includes('timestamp') || name === 'occurredat' || name === 'createdat';
}

/** @deprecated используйте isReportTimeOnlyField / isReportDateTimeField */
export function isReportTimeFilterField(field: ReportFieldDefinition): boolean {
  return isReportTimeOnlyField(field) || isReportDateTimeField(field);
}
