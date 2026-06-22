import dayjs from 'dayjs';

import type { GridColDef } from '@mui/x-data-grid';

import {
  type NamedCount,
  type ReportAggregates,
  REPORT_CHART_OTHER_KEY,
} from './aggregateReportData';
import { isReportEmptyValue, REPORT_EMPTY_DISPLAY } from './reportDisplayValue';
import { classifySobrietyLabel } from './sobriety';

type ChartColumnRole = 'eventType' | 'date' | 'user' | 'device' | 'vehicle' | 'skip';

const BREAKDOWN_LIMIT = 24;

function classifyChartColumn(field: string): ChartColumnRole {
  const key = field.toLowerCase();

  if (key.includes('__composite.user')) return 'user';
  if (key.includes('__composite.monitoringdevice')) return 'device';
  if (key.includes('__composite.vehicle')) return 'vehicle';

  if (key.includes('eventsforfront') && (key.endsWith('.label') || key.endsWith('.event'))) {
    return 'eventType';
  }
  if (key.endsWith('.label') && (key.includes('event') || key.includes('action'))) {
    return 'eventType';
  }
  if (key.includes('eventtypelabel') || key.includes('eventtype')) return 'eventType';

  if (
    key.includes('occurred') ||
    key.includes('timestamp') ||
    key.includes('createdat') ||
    key.includes('startedat')
  ) {
    return 'date';
  }

  if (key.includes('registrationnumber') || key.includes('statenumber')) return 'vehicle';

  if (key.includes('__composite') || key.includes('coordinate')) return 'skip';

  return 'skip';
}

function readChartCellLabel(value: unknown): string {
  if (isReportEmptyValue(value)) return '';
  const text = String(value).trim();
  if (!text || text === REPORT_EMPTY_DISPLAY || text === '—' || text === '-') return '';
  return text;
}

function addMap(m: Map<string, number>, key: string, n = 1) {
  const label = key.trim() || REPORT_EMPTY_DISPLAY;
  m.set(label, (m.get(label) ?? 0) + n);
}

function addNested(
  outer: Map<string, Map<string, number>>,
  outerKey: string,
  innerKey: string,
  n = 1,
) {
  if (!outerKey || !innerKey) return;
  let inner = outer.get(outerKey);
  if (!inner) {
    inner = new Map();
    outer.set(outerKey, inner);
  }
  addMap(inner, innerKey, n);
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

function breakdownFromMap(inner: Map<string, number> | undefined): NamedCount[] | undefined {
  if (!inner?.size) return undefined;
  return topSorted(inner, BREAKDOWN_LIMIT, false);
}

function withEventBreakdown(
  items: NamedCount[],
  breakdownMap: Map<string, Map<string, number>>,
): NamedCount[] {
  return items.map((item) => ({
    ...item,
    byEventType: breakdownFromMap(breakdownMap.get(item.name)),
  }));
}

function readDayKey(value: unknown): string {
  const text = readChartCellLabel(value);
  if (!text) return '';
  const parsed = dayjs(text);
  if (!parsed.isValid()) return '';
  return parsed.format('YYYY-MM-DD');
}

function pickFirstLabel(row: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const label = readChartCellLabel(row[field]);
    if (label) return label;
  }
  return '';
}

function pickFirstDay(row: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const day = readDayKey(row[field]);
    if (day) return day;
  }
  return '';
}

/** Агрегирует уже отформатированные строки таблицы — диаграммы совпадают с тем, что видит пользователь. */
export function aggregateReportGridForCharts(
  columns: GridColDef[],
  rows: Record<string, unknown>[],
): ReportAggregates | null {
  if (!rows.length) return null;

  const roles = new Map<string, ChartColumnRole>();
  const fieldsByRole: Record<Exclude<ChartColumnRole, 'skip'>, string[]> = {
    eventType: [],
    date: [],
    user: [],
    device: [],
    vehicle: [],
  };

  for (const col of columns) {
    const field = col.field;
    if (typeof field !== 'string') continue;
    const role = classifyChartColumn(field);
    if (role !== 'skip') {
      roles.set(field, role);
      fieldsByRole[role].push(field);
    }
  }

  const byType = new Map<string, number>();
  const byDay = new Map<string, number>();
  const sobriety = new Map<string, number>();
  const users = new Map<string, number>();
  const devices = new Map<string, number>();
  const vehicles = new Map<string, number>();
  const userByType = new Map<string, Map<string, number>>();
  const deviceByType = new Map<string, Map<string, number>>();
  const vehicleByType = new Map<string, Map<string, number>>();
  const dayByType = new Map<string, Map<string, number>>();

  let countedRows = 0;

  for (const row of rows) {
    const eventType = pickFirstLabel(row, fieldsByRole.eventType);
    const user = pickFirstLabel(row, fieldsByRole.user);
    const device = pickFirstLabel(row, fieldsByRole.device);
    const vehicle = pickFirstLabel(row, fieldsByRole.vehicle);
    const day = pickFirstDay(row, fieldsByRole.date);

    const rowUsed = Boolean(eventType || user || device || vehicle || day);
    if (!rowUsed) continue;
    countedRows += 1;

    if (eventType) {
      addMap(byType, eventType);
      const cls = classifySobrietyLabel(eventType);
      if (cls) addMap(sobriety, cls);
    }

    if (day) {
      addMap(byDay, day);
      if (eventType) addNested(dayByType, day, eventType);
    }

    if (user) {
      addMap(users, user);
      if (eventType) addNested(userByType, user, eventType);
    }

    if (device) {
      addMap(devices, device);
      if (eventType) addNested(deviceByType, device, eventType);
    }

    if (vehicle) {
      addMap(vehicles, vehicle);
      if (eventType) addNested(vehicleByType, vehicle, eventType);
    }
  }

  const byDaySorted = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, count]) => ({ name, count }));

  return {
    total: countedRows || rows.length,
    byEventType: topSorted(byType, 12, true),
    byDay: withEventBreakdown(byDaySorted, dayByType),
    sobrietyOnly: ['passed', 'failed', 'interrupted'].map((key) => ({
      name: key,
      value: sobriety.get(key) ?? 0,
    })),
    topUsers: withEventBreakdown(topSorted(users, Number.MAX_SAFE_INTEGER), userByType),
    topDevices: withEventBreakdown(topSorted(devices, Number.MAX_SAFE_INTEGER), deviceByType),
    topVehicles: withEventBreakdown(topSorted(vehicles, Number.MAX_SAFE_INTEGER), vehicleByType),
  };
}
