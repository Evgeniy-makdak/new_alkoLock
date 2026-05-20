import type { ReportFieldDefinition } from '../types/reportApiTypes';

const VEHICLE_LEAF_FIELDS = new Set([
  'registrationnumber',
  'manufacturer',
  'model',
  'vin',
  'year',
  'color',
  'type',
  'id',
]);

/** Имя поля для filters[] в POST отчёта при выбранном параметре ТС. */
export function resolveVehicleFilterFieldName(
  field: ReportFieldDefinition,
  attribute: string,
): string {
  const fieldName = field.fieldName;
  if (fieldName === attribute || fieldName.endsWith(`.${attribute}`)) {
    return fieldName;
  }

  const lower = fieldName.toLowerCase();
  if (lower === 'vehicle' || lower.endsWith('.vehicle')) {
    return `${fieldName}.${attribute}`;
  }

  const dot = fieldName.lastIndexOf('.');
  if (dot > 0) {
    const parent = fieldName.slice(0, dot);
    const leaf = fieldName.slice(dot + 1).toLowerCase();
    if (VEHICLE_LEAF_FIELDS.has(leaf)) {
      return `${parent}.${attribute}`;
    }
    if (parent.toLowerCase().includes('vehicle')) {
      return `${parent}.${attribute}`;
    }
  }

  return attribute;
}
