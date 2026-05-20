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

/** Поле отчёта, связанное с транспортным средством (ТС). */
export function isReportVehicleField(field: ReportFieldDefinition): boolean {
  const ref = (field.referenceEntity ?? '').toLowerCase();
  if (ref.includes('vehicle')) {
    return true;
  }

  const name = field.fieldName.toLowerCase();
  if (name.includes('vehicle') || VEHICLE_LEAF_FIELDS.has(name.split('.').pop() ?? '')) {
    return true;
  }

  const label = (field.label ?? '').trim().toLowerCase();
  if (label === 'тс' || label.includes('транспорт') || label.includes('автомобил')) {
    return true;
  }

  return false;
}
