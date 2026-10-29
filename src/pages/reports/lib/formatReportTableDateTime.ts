import { REPORT_EMPTY_DISPLAY, finalizeReportCellDisplay, isReportEmptyValue } from './reportDisplayValue';

/** Точность отображения даты/времени в ячейке отчёта. */
export type ReportDateTimePrecision = 'minute' | 'second' | 'day';

/** Листья-моменты времени: округляем до секунд. */
const DATE_TIME_SECOND_LEAFS = new Set(['timestamp', 'eventDate', 'event_date']);

/** Листья-даты документов: округляем до дня (без времени). */
const DATE_TIME_DAY_LEAFS = new Set(['birthDate', 'licenseIssueDate', 'licenseExpirationDate']);

/** Суффикс дубля колонки «field#N» → реальный fieldPath (см. reportColumnDuplicate). */
const DUP_SUFFIX_PATTERN = /#\d+$/;

/**
 * Точность отображения по пути поля отчёта:
 * - секунды — события-моменты (timestamp, eventDate, event_date, vehicleBind.createdAt);
 * - день — даты документов (birthDate, licenseIssueDate, licenseExpirationDate);
 * - минуты — остальное (createdAt, lastModifiedAt, occurredAt, startedAt, __reportRowCreatedAt и т.п.).
 */
export function resolveReportDateTimePrecision(fieldPath: string | undefined): ReportDateTimePrecision {
  const path = String(fieldPath ?? '').trim().replace(DUP_SUFFIX_PATTERN, '');
  if (!path) return 'minute';
  const leaf = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path;
  if (DATE_TIME_SECOND_LEAFS.has(leaf)) return 'second';
  // Дата установки алкозамка на ТС — момент времени, а не системный createdAt.
  if (path === 'vehicleBind.createdAt' || path.endsWith('.vehicleBind.createdAt')) {
    return 'second';
  }
  if (DATE_TIME_DAY_LEAFS.has(leaf)) return 'day';
  return 'minute';
}

/**
 * ДД.ММ.ГГГГ ЧЧ:ММ для ячеек отчёта.
 * precision: 'second' — добавляет секунды (ЧЧ:ММ:СС); 'day' — без времени (ДД.ММ.ГГГГ).
 */
export function formatReportTableDateTime(
  value: unknown,
  precision: ReportDateTimePrecision = 'minute',
): string {
  if (isReportEmptyValue(value)) {
    return REPORT_EMPTY_DISPLAY;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return finalizeReportCellDisplay(String(value));
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (precision === 'day') {
    return `${day}.${month}.${year}`;
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  if (precision === 'second') {
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
