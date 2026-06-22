import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';

import {
  aggregateReportData,
  type NamedCount,
  type ReportAggregates,
  REPORT_CHART_OTHER_KEY,
} from './aggregateReportData';
import {
  collectReportContentColumnKeys,
  orderReportContentColumnKeys,
} from './buildReportTableFieldOptions';
import { normalizeReportAggregationCode } from './reportAggregationDisplay';
import { isReportEmptyValue } from './reportDisplayValue';
import { classifySobrietyLabel, getEventTypeLabel } from './sobriety';

import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

const DATE_KEY_HINTS = ['date', 'time', 'at', 'timestamp', 'occurred', 'created'];
const EVENT_TYPE_KEY_HINTS = ['label', 'event', 'type', 'status'];
const USER_KEY_HINTS = ['user', 'driver', 'initiator', 'handler', 'fullname', 'surname'];
const DEVICE_KEY_HINTS = ['device', 'alcolock', 'monitoring'];
const VEHICLE_KEY_HINTS = ['vehicle', 'car', 'registration'];

function isDeviceEventContentRow(row: Record<string, unknown>): boolean {
  return (
    'deviceRecord' in row ||
    'eventsForFront' in row ||
    'vehicleRecord' in row ||
    'userRecord' in row ||
    'occurredAt' in row ||
    'startedAt' in row
  );
}

function keyMatchesHints(key: string, hints: string[]): boolean {
  const lower = key.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

function readScalarLabel(value: unknown): string {
  if (isReportEmptyValue(value)) return '—';
  if (typeof value === 'object' && value != null) {
    const record = value as Record<string, unknown>;
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    if (typeof record.fullName === 'string' && record.fullName.trim()) return record.fullName.trim();
    const surname = [record.surname, record.firstName].filter(Boolean).join(' ').trim();
    if (surname) return surname;
    if (record.registrationNumber) return String(record.registrationNumber);
    if (record.serialNumber) return String(record.serialNumber);
  }
  return String(value).trim() || '—';
}

function readNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function addMap(m: Map<string, number>, key: string, n = 1) {
  const label = key.trim() || '—';
  m.set(label, (m.get(label) ?? 0) + n);
}

function topSorted(m: Map<string, number>, limit: number, mergeTail = false): NamedCount[] {
  const arr = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  if (!mergeTail || arr.length <= limit) {
    return arr.slice(0, limit).map(([name, count]) => ({ name, count }));
  }
  const head = arr.slice(0, limit).map(([name, count]) => ({ name, count }));
  const rest = arr.slice(limit).reduce((sum, [, count]) => sum + count, 0);
  if (rest > 0) head.push({ name: REPORT_CHART_OTHER_KEY, count: rest });
  return head;
}

function findCountValueColumn(
  content: Record<string, unknown>[],
  groupBy: string[],
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): string | null {
  const groupSet = new Set(groupBy);
  const countField = (selectedFields ?? []).find(
    (field) => normalizeReportAggregationCode(field.aggregation) === 'count',
  )?.fieldName;
  if (countField && content.some((row) => readNumericValue(row[countField]) != null)) {
    return countField;
  }

  for (const key of Object.keys(content[0] ?? {})) {
    if (groupSet.has(key)) continue;
    if (content.every((row) => readNumericValue(row[key]) != null)) {
      return key;
    }
  }
  return null;
}

function scoreCategoryKey(key: string): number {
  const lower = key.toLowerCase();
  if (lower.endsWith('.label') || lower.includes('eventsforfront')) return 100;
  if (lower.includes('eventtypelabel') || lower.includes('eventtype')) return 90;
  if (lower.includes('.label')) return 80;
  if (lower.includes('event')) return 70;
  if (lower.includes('type') && !lower.includes('vehicle')) return 55;
  if (lower.includes('status')) return 45;
  if (lower.includes('.name') && !lower.includes('user') && !lower.includes('branch')) return 35;
  return 0;
}

function scoreDateKey(key: string): number {
  const lower = key.toLowerCase();
  if (lower.includes('occurred') || lower.includes('timestamp')) return 100;
  if (lower.includes('createdat') || lower.includes('startedat')) return 80;
  if (keyMatchesHints(key, DATE_KEY_HINTS)) return 60;
  return 0;
}

function scoreHintKey(key: string, hints: string[]): number {
  return keyMatchesHints(key, hints) ? 50 : 0;
}

function pickBestColumnKey(
  contentKeys: string[],
  selectedFieldNames: string[] | undefined,
  scoreFn: (key: string) => number,
): string | null {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const name of selectedFieldNames ?? []) {
    if (!contentKeys.includes(name) || seen.has(name)) continue;
    candidates.push(name);
    seen.add(name);
  }

  for (const key of contentKeys) {
    if (!seen.has(key)) {
      candidates.push(key);
      seen.add(key);
    }
  }

  let best: string | null = null;
  let bestScore = 0;
  for (const key of candidates) {
    const score = scoreFn(key);
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }

  return bestScore > 0 ? best : null;
}

function pickColumnKey(keys: string[], hints: string[], exclude: Set<string>): string | null {
  const available = keys.filter((key) => !exclude.has(key));
  return available.find((key) => keyMatchesHints(key, hints)) ?? null;
}

function aggregateGroupedContent(
  content: Record<string, unknown>[],
  groupBy: string[],
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): ReportAggregates {
  const groupKey = groupBy[0];
  const valueKey = findCountValueColumn(content, groupBy, selectedFields);
  const byCategory: NamedCount[] = content.map((row) => ({
    name: readScalarLabel(row[groupKey]),
    count: valueKey ? (readNumericValue(row[valueKey]) ?? 0) : 1,
  }));

  const total = byCategory.reduce((sum, row) => sum + row.count, 0);
  const sobriety = new Map<string, number>();
  for (const row of byCategory) {
    const cls = classifySobrietyLabel(row.name);
    if (cls) addMap(sobriety, cls, row.count);
  }

  return {
    total,
    byEventType: topSorted(
      new Map(byCategory.map((row) => [row.name, row.count])),
      12,
      true,
    ),
    byDay: [],
    sobrietyOnly: ['passed', 'failed', 'interrupted'].map((key) => ({
      name: key,
      value: sobriety.get(key) ?? 0,
    })),
    topUsers: [],
    topDevices: [],
    topVehicles: [],
  };
}

function aggregateGenericContent(
  content: Record<string, unknown>[],
  selectedFieldNames?: string[],
): ReportAggregates {
  const keys = orderReportContentColumnKeys(
    collectReportContentColumnKeys(content),
    selectedFieldNames,
  );
  const used = new Set<string>();

  const dateKey = pickBestColumnKey(keys, selectedFieldNames, scoreDateKey);
  if (dateKey) used.add(dateKey);

  const categoryKey = pickBestColumnKey(keys, selectedFieldNames, scoreCategoryKey);
  if (categoryKey) used.add(categoryKey);

  const userKey =
    pickBestColumnKey(keys, selectedFieldNames, (key) => scoreHintKey(key, USER_KEY_HINTS)) ??
    pickColumnKey(keys, USER_KEY_HINTS, used);
  if (userKey) used.add(userKey);

  const deviceKey =
    pickBestColumnKey(keys, selectedFieldNames, (key) => scoreHintKey(key, DEVICE_KEY_HINTS)) ??
    pickColumnKey(keys, DEVICE_KEY_HINTS, used);
  if (deviceKey) used.add(deviceKey);

  const vehicleKey =
    pickBestColumnKey(keys, selectedFieldNames, (key) => scoreHintKey(key, VEHICLE_KEY_HINTS)) ??
    pickColumnKey(keys, VEHICLE_KEY_HINTS, used);
  if (vehicleKey) used.add(vehicleKey);

  const byDay = new Map<string, number>();
  const byType = new Map<string, number>();
  const sobriety = new Map<string, number>();
  const users = new Map<string, number>();
  const devices = new Map<string, number>();
  const vehicles = new Map<string, number>();

  for (const row of content) {
    if (dateKey) {
      const raw = row[dateKey];
      const day = raw ? dayjs(String(raw)).format('YYYY-MM-DD') : '';
      if (day && dayjs(day).isValid()) addMap(byDay, day);
    }

    if (categoryKey) {
      const label = readScalarLabel(row[categoryKey]);
      addMap(byType, label);
      const cls = classifySobrietyLabel(label);
      if (cls) addMap(sobriety, cls);
    }

    if (userKey) addMap(users, readScalarLabel(row[userKey]));
    if (deviceKey) addMap(devices, readScalarLabel(row[deviceKey]));
    if (vehicleKey) addMap(vehicles, readScalarLabel(row[vehicleKey]));
  }

  const byDaySorted = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));

  return {
    total: content.length,
    byEventType: topSorted(byType, 12, true),
    byDay: byDaySorted,
    sobrietyOnly: ['passed', 'failed', 'interrupted'].map((key) => ({
      name: key,
      value: sobriety.get(key) ?? 0,
    })),
    topUsers: topSorted(users, Number.MAX_SAFE_INTEGER),
    topDevices: topSorted(devices, Number.MAX_SAFE_INTEGER),
    topVehicles: topSorted(vehicles, Number.MAX_SAFE_INTEGER),
  };
}

/** Строит агрегаты для диаграмм по всем строкам отчёта. */
export function aggregateReportContentForCharts(
  content: Record<string, unknown>[],
  options?: {
    groupBy?: string[];
    selectedFields?: ReportSelectedFieldPayload[];
    t?: TFunction;
  },
): ReportAggregates | null {
  if (!content.length) return null;

  const selectedFieldNames = options?.selectedFields
    ?.map((field) => field.fieldName)
    .filter((name): name is string => Boolean(name?.trim()));

  const groupBy = (options?.groupBy ?? []).filter(Boolean);
  if (groupBy.length) {
    return aggregateGroupedContent(content, groupBy, options?.selectedFields);
  }

  const eventLikeRows = content.filter(isDeviceEventContentRow);
  if (eventLikeRows.length >= Math.max(1, Math.floor(content.length * 0.5))) {
    return aggregateReportData(eventLikeRows as unknown as IDeviceAction[]);
  }

  const generic = aggregateGenericContent(content, selectedFieldNames);
  if (!generic.byEventType.length && !generic.byDay.length) {
    const labelFromEvents = content
      .map((row) => getEventTypeLabel(row))
      .filter((label) => label.trim());
    if (labelFromEvents.length) {
      return aggregateReportData(content as unknown as IDeviceAction[]);
    }
  }

  return generic;
}
