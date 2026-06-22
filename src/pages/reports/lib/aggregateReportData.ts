import dayjs from 'dayjs';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';

import { isReportRecordWithAnonymousUser } from './reportAnonymousUser';
import { classifySobrietyLabel, getEventTypeLabel } from './sobriety';

/** Маркер для суммы «остальных» типов событий в столбиковой диаграмме. */
export const REPORT_CHART_OTHER_KEY = '__report_other__';

export interface NamedCount {
  name: string;
  count: number;
  /** Расшифровка по типам событий (для тултипов и детализации). */
  byEventType?: NamedCount[];
  /** Доля от общего числа событий, % (одна десятичная). */
  sharePercent?: string;
}

export interface ReportAggregates {
  total: number;
  byEventType: NamedCount[];
  byDay: NamedCount[];
  sobrietyOnly: { name: string; value: number }[];
  topUsers: NamedCount[];
  topDevices: NamedCount[];
  topVehicles: NamedCount[];
}

function addMap(m: Map<string, number>, key: string, n = 1) {
  if (!key.trim()) key = '—';
  m.set(key, (m.get(key) ?? 0) + n);
}

function topSorted(
  m: Map<string, number>,
  n: number,
  options?: { mergeTail?: boolean },
): NamedCount[] {
  const arr = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  if (!options?.mergeTail || arr.length <= n) {
    return arr.slice(0, n).map(([name, count]) => ({ name, count }));
  }
  const head = arr.slice(0, n).map(([name, count]) => ({ name, count }));
  const rest = arr.slice(n).reduce((s, [, c]) => s + c, 0);
  if (rest > 0) head.push({ name: REPORT_CHART_OTHER_KEY, count: rest });
  return head;
}

export function aggregateReportData(events: IDeviceAction[]): ReportAggregates {
  const byType = new Map<string, number>();
  const byDay = new Map<string, number>();
  const sobriety = new Map<string, number>();
  const userBuckets = new Map<string, { count: number; label: string }>();
  const devices = new Map<string, number>();
  const vehicles = new Map<string, number>();

  for (const ev of events) {
    if (isReportRecordWithAnonymousUser(ev)) continue;

    const label = getEventTypeLabel(ev);
    addMap(byType, label || '—');

    const ts = ev.timestamp ?? ev.occurredAt ?? ev.createdAt;
    const dk = ts ? dayjs(ts as string).format('YYYY-MM-DD') : '';
    if (dk) addMap(byDay, dk);

    const cls = classifySobrietyLabel(label);
    if (cls) {
      addMap(sobriety, cls);
    }

    mergeUserBucket(userBuckets, ev);

    const dev = ev.deviceRecord;
    const devLabel = [dev?.name, dev?.serialNumber].filter(Boolean).join(' / ') || '—';
    addMap(devices, devLabel);

    const vr = ev.vehicleRecord;
    const vLabel =
      vr?.registrationNumber || [vr?.manufacturer, vr?.model].filter(Boolean).join(' ') || '—';
    addMap(vehicles, vLabel);
  }

  const byDaySorted = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));

  const sobrietyOnly = ['passed', 'failed', 'interrupted'].map((key) => ({
    name: key,
    value: sobriety.get(key) ?? 0,
  }));

  const allRanked = Number.MAX_SAFE_INTEGER;

  return {
    total: events.length,
    byEventType: topSorted(byType, 12, { mergeTail: true }),
    byDay: byDaySorted,
    sobrietyOnly,
    topUsers: topUserRowsFromBucket(userBuckets, allRanked),
    topDevices: topSorted(devices, allRanked),
    topVehicles: topSorted(vehicles, allRanked),
  };
}

function tFallbackUser(ev: IDeviceAction): string {
  const id = ev.userId ?? ev.user?.id;
  return id != null ? `User #${id}` : '—';
}

/** Считаем по стабильному id, чтобы разные написания ФИО в `userRecord` одного пользователя не давали два столбца. */
function mergeUserBucket(m: Map<string, { count: number; label: string }>, ev: IDeviceAction) {
  const ur = ev.userRecord;
  const label =
    [ur?.surname, ur?.firstName].filter(Boolean).join(' ').trim() || ur?.email || tFallbackUser(ev);
  const id = ur?.id ?? ev.userId ?? ev.user?.id;
  const key = id != null && String(id) !== '' ? `id:${String(id)}` : `name:${label}`;

  const prev = m.get(key);
  const count = (prev?.count ?? 0) + 1;
  const pickedLabel = prev == null ? label : label.length > prev.label.length ? label : prev.label;
  m.set(key, { count, label: pickedLabel });
}

function topUserRowsFromBucket(
  m: Map<string, { count: number; label: string }>,
  limit: number,
): NamedCount[] {
  return Array.from(m.values())
    .map(({ label, count }) => ({ name: label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
