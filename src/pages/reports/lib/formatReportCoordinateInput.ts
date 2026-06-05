import {
  REPORT_EMPTY_DISPLAY,
  finalizeReportCellDisplay,
  isReportEmptyValue,
} from './reportDisplayValue';

const COORDINATE_FRACTION_DIGITS = 5;
const COORDINATE_INTEGER_DIGITS = 2;
const COORDINATE_DIGIT_COUNT = COORDINATE_INTEGER_DIGITS + COORDINATE_FRACTION_DIGITS;

/** Макс. длина маски «широта:долгота» (59.84391:30.00875). */
export const REPORT_COORDINATE_PAIR_INPUT_MAX_LENGTH =
  COORDINATE_INTEGER_DIGITS + 1 + COORDINATE_FRACTION_DIGITS + 1 +
  COORDINATE_INTEGER_DIGITS + 1 + COORDINATE_FRACTION_DIGITS;

/** Маска: только цифры; после 2-й цифры точка подставляется сама, затем до 5 цифр дробной части. */
export function formatReportCoordinateInput(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, COORDINATE_INTEGER_DIGITS + COORDINATE_FRACTION_DIGITS);

  if (numbers.length === 0) {
    return '';
  }

  if (numbers.length === 1) {
    return numbers;
  }

  if (numbers.length === 2) {
    return `${numbers}.`;
  }

  const intPart = numbers.slice(0, COORDINATE_INTEGER_DIGITS);
  const fracPart = numbers.slice(
    COORDINATE_INTEGER_DIGITS,
    COORDINATE_INTEGER_DIGITS + COORDINATE_FRACTION_DIGITS,
  );
  return `${intPart}.${fracPart}`;
}

export function isValidReportCoordinateInput(value: string): boolean {
  if (!value) return true;
  return /^\d{1,2}(\.\d{0,5})?$/.test(value);
}

export function isCompleteReportCoordinate(value: string): boolean {
  return /^\d{1,2}\.\d{1,5}$/.test(value);
}

function tryParseTwoPartCoordinatePaste(
  value: string,
): { latPart: string; lonPart: string } | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(/,/g, '.');

  const separatorIndex = normalized.search(/[:;]/);
  if (separatorIndex >= 0) {
    return {
      latPart: normalized.slice(0, separatorIndex).trim(),
      lonPart: normalized.slice(separatorIndex + 1).trim(),
    };
  }

  const spaceParts = normalized.split(/\s+/).filter(Boolean);
  if (spaceParts.length >= 2) {
    return { latPart: spaceParts[0], lonPart: spaceParts[1] };
  }

  return null;
}

function formatCoordinatePairParts(latPart: string, lonPart: string): string {
  const lat = latPart ? formatReportCoordinateInput(latPart) : '';
  const lon = lonPart ? formatReportCoordinateInput(lonPart) : '';
  if (!lat && !lon) return '';
  if (!lon) return lat;
  if (!lat) return lon;
  return `${lat}:${lon}`;
}

/**
 * Маска пары координат: каждая часть — как formatReportCoordinateInput;
 * между широтой и долготой «:» подставляется автоматически.
 * Поддерживает вставку «59.84391 30.00875», «59.84391:30.00875», «59.84391;30.00875».
 */
export function formatReportCoordinatePairInput(value: string): string {
  if (!value.trim()) return '';

  const twoPart = tryParseTwoPartCoordinatePaste(value);
  if (twoPart) {
    return formatCoordinatePairParts(twoPart.latPart, twoPart.lonPart);
  }

  const allDigits = value.replace(/\D/g, '').slice(0, COORDINATE_DIGIT_COUNT * 2);
  const latDigits = allDigits.slice(0, COORDINATE_DIGIT_COUNT);
  const lonDigits = allDigits.slice(COORDINATE_DIGIT_COUNT);

  const lat = latDigits ? formatReportCoordinateInput(latDigits) : '';
  if (!lonDigits) return lat;

  const lon = formatReportCoordinateInput(lonDigits);
  return lat ? `${lat}:${lon}` : lon;
}

export function isValidReportCoordinatePairInput(value: string): boolean {
  if (!value) return true;
  const normalized = value.replace(';', ':');
  if (!normalized.includes(':')) {
    return isValidReportCoordinateInput(normalized);
  }
  const [lat, lon = ''] = normalized.split(':');
  return isValidReportCoordinateInput(lat) && isValidReportCoordinateInput(lon);
}

export function isCompleteReportCoordinatePair(value: string): boolean {
  const normalized = value.replace(';', ':');
  if (!normalized.includes(':')) return false;
  const [lat, lon = ''] = normalized.split(':');
  return isCompleteReportCoordinate(lat) && isCompleteReportCoordinate(lon);
}

export function truncateReportCoordinateDecimals(num: number): number {
  const sign = num < 0 ? -1 : 1;
  const abs = Math.abs(num);
  const factor = 10 ** COORDINATE_FRACTION_DIGITS;
  return (sign * Math.trunc(abs * factor)) / factor;
}

/** Нормализует строку координаты для хранения в фильтре (обрезка дробной части). */
export function normalizeReportCoordinateString(value: string): string | null {
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return null;

  const masked = formatReportCoordinateInput(trimmed);
  if (!masked || masked.endsWith('.')) {
    return masked || null;
  }

  const match = masked.match(/^(\d{1,2})(?:\.(\d+))?$/);
  if (!match) return null;

  const intPart = match[1];
  const frac = match[2] ?? '';
  return frac.length > 0 ? `${intPart}.${frac}` : intPart;
}

export function normalizeReportCoordinateFilterValue(value: unknown): number | null {
  if (value == null || value === '') return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    return truncateReportCoordinateDecimals(value);
  }

  const str = normalizeReportCoordinateString(String(value));
  if (str == null || str.endsWith('.')) return null;

  const parsed = parseFloat(str);
  return Number.isFinite(parsed) ? truncateReportCoordinateDecimals(parsed) : null;
}

/** Отображение координаты в таблице (до 5 знаков после точки, без лишних нулей). */
export function formatReportCoordinateDisplay(value: unknown): string {
  const num =
    typeof value === 'number'
      ? value
      : normalizeReportCoordinateFilterValue(value) ??
        parseFloat(String(value).trim().replace(',', '.'));

  if (!Number.isFinite(num)) {
    if (isReportEmptyValue(value)) return REPORT_EMPTY_DISPLAY;
    return finalizeReportCellDisplay(String(value));
  }

  const truncated = truncateReportCoordinateDecimals(num);
  const fixed = truncated.toFixed(COORDINATE_FRACTION_DIGITS);
  return fixed.replace(/\.?0+$/, '') || '0';
}
