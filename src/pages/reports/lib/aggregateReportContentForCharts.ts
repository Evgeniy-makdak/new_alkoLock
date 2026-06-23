import dayjs from 'dayjs';
import type { TFunction } from 'i18next';

import type { IDeviceAction } from '@shared/types/BaseQueryTypes';

import {
  aggregateReportData,
  type NamedCount,
  type ReportAggregates,
  REPORT_CHART_OTHER_KEY,
} from './aggregateReportData';
import { normalizeReportAggregationCode } from './reportAggregationDisplay';
import { isReportEmptyValue } from './reportDisplayValue';
import {
  detectChartDimensions,
  extractRowFacts,
  type DetectedChartDimensions,
  type EntityLabel,
  type RowFacts,
} from './reportChartRowLabels';
import { classifySobrietyLabel, getEventTypeLabel } from './sobriety';

import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

const RANKING_CHART_LIMIT = 12;
const BREAKDOWN_LIMIT = 8;

type BucketStore = {
  count: number;
  label: string;
  detail?: string;
  byEventType: Map<string, number>;
  byBranch: Map<string, number>;
  byUser: Map<string, { count: number; label: string }>;
  byVehicle: Map<string, { count: number; label: string }>;
  byDevice: Map<string, { count: number; label: string }>;
};

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

function readScalarLabel(value: unknown): string {
  if (isReportEmptyValue(value)) return '—';
  if (typeof value === 'object' && value != null) {
    const record = value as Record<string, unknown>;
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
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

function addEntityMap(
  m: Map<string, { count: number; label: string }>,
  entity: EntityLabel | null,
  n = 1,
) {
  if (!entity?.key) return;
  const prev = m.get(entity.key);
  m.set(entity.key, {
    count: (prev?.count ?? 0) + n,
    label: entity.label || prev?.label || entity.key,
  });
}

function ensureBucket(
  store: Map<string, BucketStore>,
  key: string,
  label: string,
  detail?: string,
): BucketStore {
  const prev = store.get(key);
  if (prev) {
    if (detail && !prev.detail) prev.detail = detail;
    return prev;
  }
  const bucket: BucketStore = {
    count: 0,
    label,
    detail,
    byEventType: new Map(),
    byBranch: new Map(),
    byUser: new Map(),
    byVehicle: new Map(),
    byDevice: new Map(),
  };
  store.set(key, bucket);
  return bucket;
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

function topEntitySorted(
  m: Map<string, { count: number; label: string }>,
  limit: number,
  mergeTail = false,
): NamedCount[] {
  const arr = Array.from(m.entries())
    .map(([key, value]) => ({ key, name: value.label, count: value.count }))
    .sort((a, b) => b.count - a.count);
  if (!mergeTail || arr.length <= limit) {
    return arr.slice(0, limit).map(({ name, count }) => ({ name, count }));
  }
  const head = arr.slice(0, limit).map(({ name, count }) => ({ name, count }));
  const rest = arr.slice(limit).reduce((sum, item) => sum + item.count, 0);
  if (rest > 0) head.push({ name: REPORT_CHART_OTHER_KEY, count: rest });
  return head;
}

function mapBreakdown(m: Map<string, number> | undefined, limit = BREAKDOWN_LIMIT): NamedCount[] | undefined {
  if (!m?.size) return undefined;
  return topSorted(m, limit, false);
}

function mapEntityBreakdown(
  m: Map<string, { count: number; label: string }> | undefined,
  limit = BREAKDOWN_LIMIT,
): NamedCount[] | undefined {
  if (!m?.size) return undefined;
  return topEntitySorted(m, limit, false);
}

function finalizeBuckets(
  store: Map<string, BucketStore>,
  limit: number,
  mergeTail: boolean,
  dimensions: DetectedChartDimensions,
): NamedCount[] {
  const arr = Array.from(store.values()).sort((a, b) => b.count - a.count);
  const sliced = mergeTail && arr.length > limit ? arr.slice(0, limit) : arr.slice(0, limit);
  const items = sliced.map((bucket) => ({
    name: bucket.label,
    count: bucket.count,
    detail: bucket.detail,
    byEventType: dimensions.eventType ? mapBreakdown(bucket.byEventType) : undefined,
    byBranch: dimensions.branch ? mapBreakdown(bucket.byBranch) : undefined,
    byUser: dimensions.user ? mapEntityBreakdown(bucket.byUser) : undefined,
    byVehicle: dimensions.vehicle ? mapEntityBreakdown(bucket.byVehicle) : undefined,
    byDevice: dimensions.device ? mapEntityBreakdown(bucket.byDevice) : undefined,
  }));

  if (!mergeTail || arr.length <= limit) return items;

  const restCount = arr.slice(limit).reduce((sum, bucket) => sum + bucket.count, 0);
  if (restCount <= 0) return items;

  return [...items, { name: REPORT_CHART_OTHER_KEY, count: restCount }];
}

function applyRowBreakdowns(bucket: BucketStore, facts: RowFacts) {
  if (facts.eventType) addMap(bucket.byEventType, facts.eventType);
  if (facts.branch) addMap(bucket.byBranch, facts.branch);
  addEntityMap(bucket.byUser, facts.user);
  addEntityMap(bucket.byVehicle, facts.vehicle);
  addEntityMap(bucket.byDevice, facts.device);
}

function aggregateFlatContent(content: Record<string, unknown>[]): ReportAggregates {
  const keys = collectContentKeys(content);
  const dimensions = detectChartDimensions(content);

  const byTypeStore = new Map<string, BucketStore>();
  const byDayStore = new Map<string, BucketStore>();
  const usersStore = new Map<string, BucketStore>();
  const devicesStore = new Map<string, BucketStore>();
  const vehiclesStore = new Map<string, BucketStore>();
  const branchesStore = new Map<string, BucketStore>();
  const sobriety = new Map<string, number>();

  let countedRows = 0;

  for (const row of content) {
    const facts = extractRowFacts(row, keys);
    if (!facts) continue;
    countedRows += 1;

    if (facts.eventType) {
      const bucket = ensureBucket(byTypeStore, facts.eventType, facts.eventType);
      bucket.count += 1;
      applyRowBreakdowns(bucket, facts);
      const cls = classifySobrietyLabel(facts.eventType);
      if (cls) addMap(sobriety, cls);
    }

    if (facts.day) {
      const bucket = ensureBucket(byDayStore, facts.day, facts.day);
      bucket.count += 1;
      applyRowBreakdowns(bucket, facts);
    }

    if (facts.user) {
      const bucket = ensureBucket(usersStore, facts.user.key, facts.user.label, facts.user.detail);
      bucket.count += 1;
      applyRowBreakdowns(bucket, facts);
    }

    if (facts.device) {
      const bucket = ensureBucket(devicesStore, facts.device.key, facts.device.label);
      bucket.count += 1;
      applyRowBreakdowns(bucket, facts);
    }

    if (facts.vehicle) {
      const bucket = ensureBucket(vehiclesStore, facts.vehicle.key, facts.vehicle.label);
      bucket.count += 1;
      applyRowBreakdowns(bucket, facts);
    }

    if (facts.branch) {
      const bucket = ensureBucket(branchesStore, facts.branch, facts.branch);
      bucket.count += 1;
      applyRowBreakdowns(bucket, facts);
    }
  }

  const byDaySorted = Array.from(byDayStore.values())
    .sort((a, b) => a.label.localeCompare(b.label))
    .map((bucket) => ({
      name: bucket.label,
      count: bucket.count,
      byEventType: dimensions.eventType ? mapBreakdown(bucket.byEventType) : undefined,
      byBranch: dimensions.branch ? mapBreakdown(bucket.byBranch) : undefined,
      byUser: dimensions.user ? mapEntityBreakdown(bucket.byUser) : undefined,
      byVehicle: dimensions.vehicle ? mapEntityBreakdown(bucket.byVehicle) : undefined,
      byDevice: dimensions.device ? mapEntityBreakdown(bucket.byDevice) : undefined,
    }));

  return {
    total: countedRows || content.length,
    dimensions,
    byEventType: finalizeBuckets(byTypeStore, RANKING_CHART_LIMIT, true, dimensions),
    byDay: byDaySorted,
    sobrietyOnly: ['passed', 'failed', 'interrupted'].map((key) => ({
      name: key,
      value: sobriety.get(key) ?? 0,
    })),
    topUsers: finalizeBuckets(usersStore, RANKING_CHART_LIMIT, true, dimensions),
    topDevices: finalizeBuckets(devicesStore, RANKING_CHART_LIMIT, true, dimensions),
    topVehicles: finalizeBuckets(vehiclesStore, RANKING_CHART_LIMIT, true, dimensions),
    topBranches: finalizeBuckets(branchesStore, RANKING_CHART_LIMIT, true, dimensions),
  };
}

function collectContentKeys(content: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const row of content) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return Array.from(keys);
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

function aggregateGroupedContent(
  content: Record<string, unknown>[],
  groupBy: string[],
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): ReportAggregates {
  const groupKey = groupBy[0];
  const valueKey = findCountValueColumn(content, groupBy, selectedFields);
  const dimensions = detectChartDimensions(content);

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
    dimensions: { ...dimensions, eventType: true },
    byEventType: topSorted(
      new Map(byCategory.map((row) => [row.name, row.count])),
      RANKING_CHART_LIMIT,
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
    topBranches: [],
  };
}

/** Строит агрегаты для диаграмм по строкам текущей страницы отчёта. */
export function aggregateReportContentForCharts(
  content: Record<string, unknown>[],
  options?: {
    groupBy?: string[];
    selectedFields?: ReportSelectedFieldPayload[];
    t?: TFunction;
  },
): ReportAggregates | null {
  if (!content.length) return null;

  const groupBy = (options?.groupBy ?? []).filter(Boolean);
  if (groupBy.length) {
    return aggregateGroupedContent(content, groupBy, options?.selectedFields);
  }

  const eventLikeRows = content.filter(isDeviceEventContentRow);
  if (eventLikeRows.length >= Math.max(1, Math.floor(content.length * 0.5))) {
    return aggregateReportData(eventLikeRows as unknown as IDeviceAction[]);
  }

  const flat = aggregateFlatContent(content);
  if (!flat.byEventType.length && !flat.byDay.length) {
    const labelFromEvents = content
      .map((row) => getEventTypeLabel(row))
      .filter((label) => label.trim());
    if (labelFromEvents.length) {
      return aggregateReportData(content as unknown as IDeviceAction[]);
    }
  }

  return flat;
}
