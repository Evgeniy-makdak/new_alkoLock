import type { ReportFieldDefinition } from '../types/reportApiTypes';

export function isReportBooleanField(field: ReportFieldDefinition): boolean {
  return (field.type ?? '').toUpperCase().trim() === 'BOOLEAN';
}

function coordinateFieldLeafName(fieldName: string): string {
  const lower = fieldName.toLowerCase();
  const leaf = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : lower;
  return leaf;
}

/** Широта / долгота (latitude, longitude). */
export function isReportCoordinateField(field: ReportFieldDefinition): boolean {
  const leaf = coordinateFieldLeafName(field.fieldName);
  return leaf === 'latitude' || leaf === 'longitude';
}

/** Числовые поля и `*.id` — в query уходит number, не строка. */
export function isReportNumericFilterField(field: ReportFieldDefinition): boolean {
  const type = (field.type ?? '').toUpperCase();
  if (
    type === 'NUMBER' ||
    type === 'INTEGER' ||
    type === 'INT' ||
    type === 'LONG' ||
    type === 'ID'
  ) {
    return true;
  }
  const name = field.fieldName.toLowerCase();
  const leaf = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;
  return leaf === 'id';
}

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
