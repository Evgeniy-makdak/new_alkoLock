import { normalizeReportCoordinateFilterValue } from './formatReportCoordinateInput';

export type ReportCoordinatePair = {
  latitude: number;
  longitude: number;
};

/** Парсит «59.84391:30.00875» или «59.84391;30.00875» из отображаемой ячейки. */
export function parseReportCoordinatePairFromDisplay(
  display: unknown,
): ReportCoordinatePair | null {
  const raw = String(display ?? '').trim();
  if (!raw || raw === '—' || raw === '-') return null;

  const separator = raw.includes(';') ? ';' : raw.includes(':') ? ':' : null;
  if (!separator) return null;

  const [latPart, lonPart] = raw.split(separator);
  const latitude = normalizeReportCoordinateFilterValue(latPart);
  const longitude = normalizeReportCoordinateFilterValue(lonPart);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

/** Широта/долгота из плоской строки ответа query (latitude или prefix.latitude). */
export function readReportRowCoordinatePair(
  row: Record<string, unknown>,
  prefix = '',
): ReportCoordinatePair | null {
  const latKey = prefix ? `${prefix}.latitude` : 'latitude';
  const lonKey = prefix ? `${prefix}.longitude` : 'longitude';
  const latitude = normalizeReportCoordinateFilterValue(row[latKey]);
  const longitude = normalizeReportCoordinateFilterValue(row[lonKey]);
  if (latitude != null && longitude != null) {
    return { latitude, longitude };
  }

  const compositeKey = prefix
    ? `${prefix}.__composite.Coordinates`
    : '__composite.Coordinates';
  return parseReportCoordinatePairFromDisplay(row[compositeKey]);
}

/** Госномер ТС для перехода на карту (как в EventData / MapLink). */
export function readReportRowVehicleRegistration(row: Record<string, unknown>): string | null {
  const candidates = [
    'vehicleRecord.registrationNumber',
    'vehicle.registrationNumber',
    'deviceEvent.vehicleRecord.registrationNumber',
    'registrationNumber',
  ];

  for (const key of candidates) {
    const raw = row[key];
    if (raw == null || raw === '') continue;
    const s = String(raw).trim();
    if (s && s !== '—' && s !== '-') return s;
  }

  return null;
}
