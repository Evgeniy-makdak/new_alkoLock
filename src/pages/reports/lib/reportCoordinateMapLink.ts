import type { ReportSelectedFieldPayload } from '@pages/reports/types/reportApiTypes';

import { extractVehicleCarFromRecord } from './reportVehicleBindLabel';
import { normalizeReportCoordinateFilterValue } from './formatReportCoordinateInput';

export type ReportCoordinatePair = {
  latitude: number;
  longitude: number;
};

const COORDINATE_LEAF_FIELDS = new Set(['latitude', 'longitude']);
const MAX_REPORT_SELECTED_FIELD_DEPTH = 3;

/** Упрощённый шаблон российского госномера (латиница). */
const RU_PLATE_BODY_RE = /([ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}\d{0,3})/i;

function isReportEmptyScalar(value: unknown): boolean {
  if (value == null || value === '') return true;
  const s = String(value).trim();
  return !s || s === '—' || s === '-';
}

function normalizePlateToken(value: string): string {
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

/** Извлекает госномер из скаляра или подписи ТС «Manufacturer Model ( P544XB )». */
export function parseReportVehicleRegistrationFromDisplay(value: unknown): string | null {
  if (isReportEmptyScalar(value)) return null;

  const raw = String(value).trim();
  const parenMatch = raw.match(/\(\s*([^)]+?)\s*\)/);
  if (parenMatch) {
    const inner = normalizePlateToken(parenMatch[1]);
    if (inner && RU_PLATE_BODY_RE.test(inner)) {
      return inner;
    }
    if (/^[A-ZА-Я]\d{3}[A-ZА-Я]{2}\d{0,3}$/i.test(inner)) {
      return inner;
    }
  }

  const compact = normalizePlateToken(raw);
  const plateMatch = compact.match(RU_PLATE_BODY_RE);
  if (plateMatch) {
    return plateMatch[1].toUpperCase();
  }

  if (compact.length >= 6 && compact.length <= 12 && !raw.includes(' ')) {
    return compact;
  }

  return null;
}

function readScalarRegistration(row: Record<string, unknown>, key: string): string | null {
  return parseReportVehicleRegistrationFromDisplay(row[key]);
}

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

/** Id события для подгрузки vehicleRecord, если в строке отчёта нет госномера. */
export function readReportRowEventId(
  row: Record<string, unknown>,
  coordinatePrefix = '',
): string | number | null {
  const candidates = [
    coordinatePrefix ? `${coordinatePrefix}.id` : '',
    'id',
    'deviceEvent.id',
    'action.id',
  ].filter(Boolean);

  for (const key of candidates) {
    const raw = row[key];
    if (raw == null || raw === '') continue;
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    const s = String(raw).trim();
    if (s && s !== '—' && s !== '-') return s;
  }

  return null;
}

/** Госномер ТС для перехода на карту (как в EventData / MapLink). */
export function readReportRowVehicleRegistration(
  row: Record<string, unknown>,
  coordinatePrefix = '',
): string | null {
  const explicitCandidates = [
    coordinatePrefix ? `${coordinatePrefix}.vehicle.registrationNumber` : '',
    coordinatePrefix ? `${coordinatePrefix}.vehicleRecord.registrationNumber` : '',
    'vehicle.registrationNumber',
    'vehicleRecord.registrationNumber',
    'deviceEvent.vehicleRecord.registrationNumber',
    'action.vehicleRecord.registrationNumber',
    'registrationNumber',
  ].filter(Boolean);

  for (const key of explicitCandidates) {
    const parsed = readScalarRegistration(row, key);
    if (parsed) return parsed;
  }

  for (const [key, raw] of Object.entries(row)) {
    if (key.endsWith('.registrationNumber') || key === 'registrationNumber') {
      const parsed = readScalarRegistration(row, key);
      if (parsed) return parsed;
    }
    if (
      key.includes('vehicleRecord') ||
      key.includes('vehicleBind') ||
      key.endsWith('.vehicle') ||
      key === 'vehicle'
    ) {
      const car = extractVehicleCarFromRecord(raw);
      const parsed = parseReportVehicleRegistrationFromDisplay(car?.registrationNumber);
      if (parsed) return parsed;
    }
    if (key.includes('__composite.Vehicle')) {
      const parsed = parseReportVehicleRegistrationFromDisplay(raw);
      if (parsed) return parsed;
    }
  }

  for (const raw of Object.values(row)) {
    if (typeof raw === 'string') {
      const parsed = parseReportVehicleRegistrationFromDisplay(raw);
      if (parsed) return parsed;
    }
  }

  return null;
}

function coordinatePrefixFromFieldName(fieldName: string): string {
  const leaf = fieldName.includes('.')
    ? fieldName.slice(fieldName.lastIndexOf('.') + 1)
    : fieldName;
  if (!COORDINATE_LEAF_FIELDS.has(leaf)) return '';
  return fieldName.includes('.') ? fieldName.slice(0, fieldName.lastIndexOf('.')) : '';
}

function isRegistrationNumberPath(path: string): boolean {
  return path === 'registrationNumber' || path.endsWith('.registrationNumber');
}

function registrationPathMatchesCoordinatePrefix(regPath: string, coordPrefix: string): boolean {
  if (coordPrefix) {
    return regPath.startsWith(`${coordPrefix}.`);
  }
  return regPath.split('.').length <= MAX_REPORT_SELECTED_FIELD_DEPTH;
}

/**
 * Для перехода на карту по координатам бэкенд должен вернуть госномер в content.
 * Добавляем только пути из metadata (allowedPaths), иначе POST …/query отвечает 409.
 */
export function augmentReportSelectedFieldsForMapNavigation(
  fields: ReportSelectedFieldPayload[],
  allowedPaths: Set<string>,
): ReportSelectedFieldPayload[] {
  if (!allowedPaths.size) return fields;

  const fieldNames = new Set(fields.map((field) => field.fieldName));
  const prefixes = new Set<string>();

  for (const field of fields) {
    const leaf = field.fieldName.includes('.')
      ? field.fieldName.slice(field.fieldName.lastIndexOf('.') + 1)
      : field.fieldName;
    if (!COORDINATE_LEAF_FIELDS.has(leaf)) continue;
    prefixes.add(coordinatePrefixFromFieldName(field.fieldName));
  }

  if (!prefixes.size) return fields;

  const registrationCandidates = Array.from(allowedPaths).filter(isRegistrationNumberPath);
  const extra: ReportSelectedFieldPayload[] = [];

  for (const prefix of Array.from(prefixes)) {
    const matching = registrationCandidates
      .filter((path) => registrationPathMatchesCoordinatePrefix(path, prefix))
      .sort((a, b) => a.split('.').length - b.split('.').length);

    for (const candidate of matching) {
      if (fieldNames.has(candidate)) break;
      if (candidate.split('.').length > MAX_REPORT_SELECTED_FIELD_DEPTH) continue;
      fieldNames.add(candidate);
      extra.push({ fieldName: candidate });
      break;
    }
  }

  return extra.length ? [...fields, ...extra] : fields;
}
