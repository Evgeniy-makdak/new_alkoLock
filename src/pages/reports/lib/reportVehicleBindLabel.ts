import type { ICar } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { formatReportCarDisplay, isReportEmptyValue } from './reportDisplayValue';

/** Как в фильтре «Поиск по ТС» (CarsSelect): manufacturer model ( госномер ). */
export function formatReportVehicleCarLabel(record: unknown, fallback = ''): string {
  const car = extractVehicleCarFromRecord(record);
  if (!car) return isReportEmptyValue(fallback) ? '—' : fallback;
  const formatted = formatReportCarDisplay(car);
  if (formatted !== '—') return formatted;
  if (!isReportEmptyValue(fallback)) return fallback;
  return isReportEmptyValue(car.id) ? '—' : String(car.id);
}

/** vehicle / vehicleBind.vehicle из записи MonitoringDevice, VehicleBind и т.п. */
export function extractVehicleCarFromRecord(record: unknown): ICar | undefined {
  if (record == null || typeof record !== 'object') return undefined;
  const r = record as Record<string, unknown>;

  if (
    r.id != null &&
    (typeof r.manufacturer === 'string' ||
      typeof r.model === 'string' ||
      typeof r.registrationNumber === 'string')
  ) {
    return record as ICar;
  }

  const vehicle = r.vehicle;
  if (vehicle != null && typeof vehicle === 'object' && !Array.isArray(vehicle)) {
    return vehicle as ICar;
  }

  const bind = r.vehicleBind;
  if (bind != null && typeof bind === 'object' && !Array.isArray(bind)) {
    const bindVehicle = (bind as Record<string, unknown>).vehicle;
    if (bindVehicle != null && typeof bindVehicle === 'object' && !Array.isArray(bindVehicle)) {
      return bindVehicle as ICar;
    }
  }

  return undefined;
}

/** Поле фильтра «привязка к ТС» — значение = id ТС, подпись = carNameFormatter. */
export function isReportVehicleCarDisplayAttribute(attribute: string): boolean {
  const attr = (attribute ?? '').trim();
  if (!attr) return false;
  if (attr === 'vehicleBind' || attr === 'vehicle' || attr === 'vehicleBind.vehicle') {
    return true;
  }
  if (attr.endsWith('.vehicle')) {
    const tail = attr.slice(attr.lastIndexOf('.vehicle') + '.vehicle'.length);
    return tail === '';
  }
  return false;
}

export function readReportVehicleCarFilterValue(record: unknown): string | number | null {
  const car = extractVehicleCarFromRecord(record);
  if (car?.id == null || car.id === '') return null;
  return car.id;
}

export function buildReportVehicleCarValueOptions(records: unknown[]): Values {
  const seen = new Map<string, Values[number]>();

  for (const record of records) {
    const car = extractVehicleCarFromRecord(record);
    if (car?.id == null || car.id === '') continue;
    const value = String(car.id);
    if (seen.has(value)) continue;
    seen.set(value, {
      value: car.id,
      label: formatReportVehicleCarLabel(record, value),
    });
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru', { numeric: true }),
  );
}
