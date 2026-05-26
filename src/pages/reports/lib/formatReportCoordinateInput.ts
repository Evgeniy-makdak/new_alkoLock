const COORDINATE_FRACTION_DIGITS = 5;
const COORDINATE_INTEGER_DIGITS = 2;

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
    return String(value ?? '—');
  }

  const truncated = truncateReportCoordinateDecimals(num);
  const fixed = truncated.toFixed(COORDINATE_FRACTION_DIGITS);
  return fixed.replace(/\.?0+$/, '') || '0';
}
