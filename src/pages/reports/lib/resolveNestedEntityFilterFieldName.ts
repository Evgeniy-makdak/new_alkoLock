import type { ReportFieldDefinition } from '../types/reportApiTypes';

/** Имя поля в filters[]: «device.serialNumber», «vehicle.id» и т.д. */
export function resolveNestedEntityFilterFieldName(
  field: ReportFieldDefinition,
  attribute: string,
): string {
  const fieldName = field.fieldName;
  if (attribute.includes('.')) {
    return `${fieldName}.${attribute}`;
  }
  if (fieldName === attribute || fieldName.endsWith(`.${attribute}`)) {
    return fieldName;
  }
  const lower = fieldName.toLowerCase();
  if (lower === 'vehicle' || lower === 'device' || lower.endsWith('.vehicle') || lower.endsWith('.device')) {
    return `${fieldName}.${attribute}`;
  }
  const dot = fieldName.lastIndexOf('.');
  if (dot > 0) {
    return `${fieldName.slice(0, dot)}.${attribute}`;
  }
  return `${fieldName}.${attribute}`;
}
