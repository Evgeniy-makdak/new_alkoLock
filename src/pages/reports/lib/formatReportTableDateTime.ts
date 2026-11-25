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
 *
 * @param entityName — корневая сущность отчёта; только для точечных исключений
 *   (AutoServiceHistory.createdAt → секунды), без влияния на прочие отчёты.
 */
export function resolveReportDateTimePrecision(
  fieldPath: string | undefined,
  entityName?: string | null,
): ReportDateTimePrecision {
  const path = String(fieldPath ?? '').trim().replace(DUP_SUFFIX_PATTERN, '');
  if (!path) return 'minute';
  const leaf = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path;
  if (DATE_TIME_SECOND_LEAFS.has(leaf)) return 'second';
  // Дата установки алкозамка на ТС — момент времени, а не системный createdAt.
  if (path === 'vehicleBind.createdAt' || path.endsWith('.vehicleBind.createdAt')) {
    return 'second';
  }
  // «Отчёт по истории автосервиса» → «Дата создания»: до секунд (только этот отчёт).
  if (
    (entityName ?? '').trim() === 'AutoServiceHistory' &&
    (leaf === 'createdAt' || path === 'createdAt')
  ) {
    return 'second';
  }
  if (DATE_TIME_DAY_LEAFS.has(leaf)) return 'day';
  return 'minute';
}

/**
 * Код selectedFields.dateTimeFormat по смысловой точности поля.
 * В API нет `second` — моменты событий → `minute` (наименьший шаг formatters).
 */
export function resolveSemanticDateTimeFormatCode(
  fieldPath: string | undefined,
  entityName?: string | null,
): 'minute' | 'day' {
  return resolveReportDateTimePrecision(fieldPath, entityName) === 'day' ? 'day' : 'minute';
}

/**
 * Усечённые DATETIME из select (dateTimeFormat бэка) — без `T`, не прогонять через Date
 * (иначе «2025-03» / «2025-03-31 07» ломаются).
 * day `YYYY-MM-DD` → ДД.ММ.ГГГГ; остальное — как пришло.
 */
export function formatBackendTruncatedDateTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2} \d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-');
    return `${day}.${month}.${year}`;
  }
  return null;
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
  const asString = String(value);
  const truncated = formatBackendTruncatedDateTime(asString);
  if (truncated != null) {
    return finalizeReportCellDisplay(truncated);
  }
  const date = new Date(asString);
  if (Number.isNaN(date.getTime())) {
    return finalizeReportCellDisplay(asString);
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
