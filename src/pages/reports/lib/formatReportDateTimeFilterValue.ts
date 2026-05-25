import dayjs, { type Dayjs } from 'dayjs';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

import { isCompleteReportTime } from './formatReportTimeInput';
import { isReportDateTimeField, isReportYearOnlyField } from './reportFieldFilterKind';

/** Метка времени для UI. */
export function formatDateTimeDisplay(date: Dayjs): string {
  return date.format('DD.MM.YYYY HH:mm');
}

/** ISO UTC для момента (дата + ЧЧ:ММ). */
export function combineDateAndTimeToIso(date: Dayjs, timeHm: string): string | null {
  if (!date.isValid() || !isCompleteReportTime(timeHm)) {
    return null;
  }
  const [hours, minutes] = timeHm.split(':').map((p) => parseInt(p, 10));
  return date.hour(hours).minute(minutes).second(0).millisecond(0).toISOString();
}

export function parseStoredDateTimeValue(
  stored: string | number,
): { date: Dayjs; time: string } | null {
  if (stored == null || stored === '') {
    return null;
  }

  const parsed =
    typeof stored === 'number' || /^\d+$/.test(String(stored).trim())
      ? dayjs(Number(stored))
      : dayjs(String(stored));

  if (!parsed.isValid()) {
    return null;
  }

  return { date: parsed, time: parsed.format('HH:mm') };
}

export function toReportDateTimeFilterIso(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.toISOString() : null;
  }
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
    const parsed = dayjs(Number(value));
    return parsed.isValid() ? parsed.toISOString() : null;
  }
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return combineDateAndTimeToIso(dayjs(), value);
  }
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.toISOString() : null;
}

/** Одно значение фильтра (до обёртки в values[]). */
export function formatFilterValueForField(
  field: ReportFieldDefinition | undefined,
  value: unknown,
): unknown {
  if (!field) {
    return value;
  }
  const type = (field.type ?? '').toUpperCase();
  if (type === 'BOOLEAN') {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
  }
  if (isReportYearOnlyField(field)) {
    const year = parseInt(String(value).trim(), 10);
    return Number.isFinite(year) ? year : value;
  }
  if (type === 'ENUM' || type === 'TEXT') {
    return value == null || value === '' ? value : String(value);
  }
  if (!isReportDateTimeField(field)) {
    return value;
  }
  return toReportDateTimeFilterIso(value) ?? value;
}
