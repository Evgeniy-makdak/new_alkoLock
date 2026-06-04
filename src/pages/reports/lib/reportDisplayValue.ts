import type { ICar } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

export const REPORT_EMPTY_DISPLAY = '—';

/** Пустое значение в ответе API или UI (null, пустая строка, литерал "null"). */
export function isReportEmptyValue(value: unknown): boolean {
  if (value == null || value === '') return true;
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' || trimmed === 'null' || trimmed === 'undefined';
  }
  return false;
}

/** Итоговая строка ячейки: пустое и «null null ( null )» → прочерк. */
export function finalizeReportCellDisplay(display: string): string {
  const trimmed = display.trim();
  if (!trimmed) return REPORT_EMPTY_DISPLAY;
  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return REPORT_EMPTY_DISPLAY;
  if (isNullishOnlyDisplayString(trimmed)) return REPORT_EMPTY_DISPLAY;
  return display;
}

function isNullishOnlyDisplayString(value: string): boolean {
  const tokens = value
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (!tokens.length) return true;
  return tokens.every((token) => {
    const lower = token.toLowerCase();
    return lower === 'null' || lower === 'undefined' || token === '—' || token === '-';
  });
}

function reportScalarToString(value: unknown): string {
  if (isReportEmptyValue(value)) return '';
  return String(value).trim();
}

/** Подпись ТС для таблицы отчётов (без «null» в шаблоне carNameFormatter). */
export function formatReportCarDisplay(
  car: Partial<ICar> | null | undefined,
  readWithRegistration = true,
): string {
  if (!car || typeof car !== 'object') return REPORT_EMPTY_DISPLAY;

  const manufacturer = reportScalarToString(car.manufacturer);
  const model = reportScalarToString(car.model);
  const registrationNumber = reportScalarToString(car.registrationNumber);

  if (!manufacturer && !model && !registrationNumber) {
    return REPORT_EMPTY_DISPLAY;
  }

  const formatted = Formatters.carNameFormatter(
    { manufacturer, model, registrationNumber } as ICar,
    false,
    readWithRegistration,
    false,
  );

  return finalizeReportCellDisplay(formatted ?? '');
}
