import type { TFunction } from 'i18next';

import { COORDINATES_COMPOSITE_KIND } from './reportCoordinateComposite';
import { REPORT_EMPTY_DISPLAY, finalizeReportCellDisplay, isReportEmptyValue } from './reportDisplayValue';

import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

export type ReportCompositeColumnForAggregation = {
  kind: string;
  memberKeys: string[];
  prefix: string;
};

export function normalizeReportAggregationCode(code: string | undefined | null): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  return normalized || null;
}

export function buildReportFieldAggregationMap(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of selectedFields ?? []) {
    const name = field.fieldName?.trim();
    const agg = normalizeReportAggregationCode(field.aggregation);
    if (name && agg) {
      map.set(name, agg);
    }
  }
  return map;
}

export function buildReportGroupBySet(groupBy: string[] | undefined): Set<string> {
  return new Set((groupBy ?? []).map((field) => field.trim()).filter(Boolean));
}

export function resolveReportColumnDisplayAggregation(
  columnKey: string,
  compositeGroup: ReportCompositeColumnForAggregation | undefined,
  aggregationMap: Map<string, string>,
  groupBySet: Set<string>,
): string | null {
  if (compositeGroup) {
    const memberAggregations = compositeGroup.memberKeys
      .map((member) => aggregationMap.get(member))
      .filter((agg): agg is string => Boolean(agg));
    if (!memberAggregations.length) return null;

    const normalized = memberAggregations.map(
      (agg) => normalizeReportAggregationCode(agg)!,
    );
    const unique = new Set(normalized);
    if (unique.size === 1) return Array.from(unique)[0];
    if (normalized.every((agg) => agg === 'count')) return 'count';
    return normalized[0];
  }

  if (groupBySet.has(columnKey)) return null;
  return aggregationMap.get(columnKey) ?? null;
}

export function formatReportAggregationHeaderSuffix(aggregation: string, t: TFunction): string {
  const key = normalizeReportAggregationCode(aggregation);
  if (!key) return '';
  const label = t(`reports.aggregation.${key}`, { defaultValue: '' });
  if (!label) return ` (${aggregation})`;
  return ` (${label})`;
}

export function applyReportAggregationHeaderLabel(
  baseLabel: string,
  aggregation: string | null | undefined,
  t: TFunction,
): string {
  if (!aggregation) return baseLabel;
  return `${baseLabel}${formatReportAggregationHeaderSuffix(aggregation, t)}`;
}

/** Карта координат: без агрегации или при max — пара из одной строки ответа; при count — число. */
export function shouldRenderReportCoordinateAsMap(
  compositeGroup: ReportCompositeColumnForAggregation | undefined,
  aggregationMap: Map<string, string>,
): boolean {
  if (!compositeGroup || compositeGroup.kind !== COORDINATES_COMPOSITE_KIND) return false;

  const memberAggregations = compositeGroup.memberKeys
    .map((member) => normalizeReportAggregationCode(aggregationMap.get(member)))
    .filter((agg): agg is string => Boolean(agg));

  if (!memberAggregations.length) return true;
  return memberAggregations.every((agg) => agg !== 'count');
}

export function formatAggregatedReportCoordinateCountValue(
  group: ReportCompositeColumnForAggregation,
  row: Record<string, unknown>,
): string {
  const latKey =
    group.memberKeys.find((member) => member === 'latitude' || member.endsWith('.latitude')) ??
    (group.prefix ? `${group.prefix}.latitude` : 'latitude');
  const raw = row[latKey];
  if (isReportEmptyValue(raw)) return REPORT_EMPTY_DISPLAY;
  return finalizeReportCellDisplay(String(raw));
}

export function isReportFieldAggregatedForDisplay(
  fieldName: string,
  aggregationMap: Map<string, string>,
): boolean {
  return aggregationMap.has(fieldName);
}
