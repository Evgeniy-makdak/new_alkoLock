import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import { type ReportTableFieldOptionDraft } from './buildReportTableFieldOptions';
import {
  REPORT_COMPOSITE_SEGMENT,
  buildReportCompositeFieldPath,
  isReportCompositeFieldPath,
} from './reportEntityCompositeFields';
import {
  formatReportCoordinateDisplay,
  normalizeReportCoordinateFilterValue,
} from './formatReportCoordinateInput';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
} from '../types/reportApiTypes';

export const COORDINATES_COMPOSITE_KIND = 'Coordinates';

export const COORDINATE_MEMBER_FIELD_NAMES = ['latitude', 'longitude'] as const;

export const COORDINATE_PAIR_VALUE_SEPARATOR = ':';

export function isReportCoordinateMemberField(leaf: string): boolean {
  return COORDINATE_MEMBER_FIELD_NAMES.includes(
    leaf as (typeof COORDINATE_MEMBER_FIELD_NAMES)[number],
  );
}

export function buildReportCoordinatesCompositePropertyFieldName(): string {
  return `${REPORT_COMPOSITE_SEGMENT}.${COORDINATES_COMPOSITE_KIND}`;
}

export function isReportCoordinatesCompositePropertyFieldName(fieldName: string): boolean {
  return fieldName === buildReportCoordinatesCompositePropertyFieldName();
}

export function isReportCoordinatesCompositePath(path: string): boolean {
  return path.includes(`${REPORT_COMPOSITE_SEGMENT}.${COORDINATES_COMPOSITE_KIND}`);
}

export function parseFieldPath(path: string): { prefix: string; leaf: string } {
  const trimmed = path.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot < 0) return { prefix: '', leaf: trimmed };
  return { prefix: trimmed.slice(0, dot), leaf: trimmed.slice(dot + 1) };
}

export function expandCoordinatesCompositeFieldPath(path: string): string[] {
  if (!isReportCoordinatesCompositePath(path)) return [path];
  const parts = path.split('.');
  const segIdx = parts.indexOf(REPORT_COMPOSITE_SEGMENT);
  if (segIdx < 0 || parts[segIdx + 1] !== COORDINATES_COMPOSITE_KIND) return [path];
  const prefix = parts.slice(0, segIdx).join('.');
  return COORDINATE_MEMBER_FIELD_NAMES.map((leaf) =>
    prefix ? `${prefix}.${leaf}` : leaf,
  );
}

export function formatReportCoordinatesCompositeCellValue(
  prefix: string,
  row: Record<string, unknown>,
): string {
  const read = (leaf: string) => {
    const key = prefix ? `${prefix}.${leaf}` : leaf;
    return row[key];
  };
  const lat = formatReportCoordinateDisplay(read('latitude'));
  const lon = formatReportCoordinateDisplay(read('longitude'));
  if (lat === '—' && lon === '—') return '—';
  return `${lat}${COORDINATE_PAIR_VALUE_SEPARATOR}${lon}`;
}

export function formatCoordinatePairLabel(lat: unknown, lon: unknown): string {
  return `${formatReportCoordinateDisplay(lat)}${COORDINATE_PAIR_VALUE_SEPARATOR}${formatReportCoordinateDisplay(lon)}`;
}

export function parseCoordinatePairFilterValue(
  value: unknown,
): { latitude: number; longitude: number } | null {
  const raw = String(value ?? '').trim();
  if (!raw.includes(COORDINATE_PAIR_VALUE_SEPARATOR)) return null;
  const [latPart, lonPart] = raw.split(COORDINATE_PAIR_VALUE_SEPARATOR);
  const latitude = normalizeReportCoordinateFilterValue(latPart);
  const longitude = normalizeReportCoordinateFilterValue(lonPart);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function readRecordCoordinate(record: unknown, attribute: string): unknown {
  if (record == null || typeof record !== 'object') return null;
  if (!attribute.includes('.')) {
    return (record as Record<string, unknown>)[attribute];
  }
  const parts = attribute.split('.');
  let cur: unknown = record;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return null;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Уникальные пары широта:долгота из записей API. */
export function buildCoordinatePairValueOptions(
  records: unknown[],
  attributePrefix = '',
): Values {
  const seen = new Map<string, Values[number]>();
  const latKey = attributePrefix ? `${attributePrefix}.latitude` : 'latitude';
  const lonKey = attributePrefix ? `${attributePrefix}.longitude` : 'longitude';

  for (const record of records) {
    const lat = readRecordCoordinate(record, latKey);
    const lon = readRecordCoordinate(record, lonKey);
    if (lat == null || lat === '' || lon == null || lon === '') continue;

    const label = formatCoordinatePairLabel(lat, lon);
    const value = label;
    if (!seen.has(value)) {
      seen.set(value, { value, label });
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  );
}

export function hasFilterableCoordinateMembers(
  metadata: ReportEntityMetadata | null | undefined,
): boolean {
  const fields = (metadata?.fields ?? []).filter((f) => f.filterable);
  return (
    fields.some((f) => f.fieldName === 'latitude') &&
    fields.some((f) => f.fieldName === 'longitude')
  );
}

export function isRootCoordinatesCompositeOutputFilter(
  primaryKey: string,
  metadata: ReportEntityMetadata | null | undefined,
): boolean {
  if (!primaryKey || !metadata) return false;
  if (!isReportCoordinatesCompositePath(primaryKey)) return false;
  return hasFilterableCoordinateMembers(metadata);
}

export function buildSyntheticCoordinatesFilterField(
  template?: ReportFieldDefinition,
): ReportFieldDefinition {
  const base = template ?? {
    fieldName: buildReportCoordinatesCompositePropertyFieldName(),
    label: 'Coordinates',
    alias: null,
    type: 'COORDINATE',
    filterable: true,
    sortable: false,
    groupable: false,
    aggregation: null,
    availableOperations: [{ code: 'eq', label: '=' }, { code: 'in', label: 'in' }],
    availableFunctions: [],
  };
  return {
    ...base,
    fieldName: buildReportCoordinatesCompositePropertyFieldName(),
    filterable: true,
  };
}

type CoordinateGroup = {
  sourceLabel: string;
  prefix: string;
  members: ReportTableFieldOptionDraft[];
};

/** Объединяет latitude/longitude в одну колонку «Координаты». */
export function applyReportCoordinateFieldGrouping(
  drafts: ReportTableFieldOptionDraft[],
  t: TFunction,
): ReportTableFieldOptionDraft[] {
  const groups = new Map<string, CoordinateGroup>();
  const passthrough: ReportTableFieldOptionDraft[] = [];

  for (const draft of drafts) {
    const { prefix, leaf } = parseFieldPath(draft.value);
    if (!isReportCoordinateMemberField(leaf)) {
      passthrough.push(draft);
      continue;
    }
    const gk = `${prefix}\0${draft.sourceLabel}`;
    let group = groups.get(gk);
    if (!group) {
      group = { sourceLabel: draft.sourceLabel, prefix, members: [] };
      groups.set(gk, group);
    }
    group.members.push(draft);
  }

  const compositeDrafts: ReportTableFieldOptionDraft[] = [];
  for (const group of Array.from(groups.values())) {
    const compositePath = buildReportCompositeFieldPath(
      group.prefix,
      COORDINATES_COMPOSITE_KIND,
    );
    compositeDrafts.push({
      value: compositePath,
      baseLabel: t('reports.composite.coordinatesDisplay'),
      sourceLabel: group.sourceLabel,
      qualifyAs: group.prefix ? 'nested' : 'root',
      leafKey: `${COORDINATES_COMPOSITE_KIND}:${REPORT_COMPOSITE_SEGMENT}.${COORDINATES_COMPOSITE_KIND}`,
    });
  }

  const memberPaths = new Set<string>();
  for (const group of Array.from(groups.values())) {
    for (const m of group.members) {
      memberPaths.add(m.value);
    }
  }

  const filtered = passthrough.filter((d) => !memberPaths.has(d.value));
  return [...filtered, ...compositeDrafts];
}

export function groupFilterableFieldsWithCoordinates(
  fields: ReportFieldDefinition[],
  t: TFunction,
): Values {
  const members = new Set<string>(COORDINATE_MEMBER_FIELD_NAMES);
  const hasMember = fields.some((f) => members.has(f.fieldName));
  if (!hasMember) {
    return fields.map((f) => ({
      value: f.fieldName,
      label: (f.label ?? '').trim() || f.fieldName,
    }));
  }
  const other = fields.filter((f) => !members.has(f.fieldName));
  const compositeOption = {
    value: buildReportCoordinatesCompositePropertyFieldName(),
    label: t('reports.composite.entityCoordinates'),
  };
  return [
    ...other.map((f) => ({
      value: f.fieldName,
      label: (f.label ?? '').trim() || f.fieldName,
    })),
    compositeOption,
  ];
}

export function resolveCoordinateMemberFilterFieldName(
  primaryField: ReportFieldDefinition,
  path: string[],
  member: 'latitude' | 'longitude',
): string {
  const withoutComposite = path.filter(
    (step) => !isReportCoordinatesCompositePropertyFieldName(step),
  );
  const attributePath = [...withoutComposite, member].filter(Boolean).join('.');
  if (!attributePath) return member;
  const fieldName = primaryField.fieldName;
  if (attributePath === member || fieldName === attributePath) return attributePath;
  if (fieldName === member || fieldName.endsWith(`.${member}`)) return fieldName;
  if (attributePath.includes('.')) {
    const lower = fieldName.toLowerCase();
    if (
      lower === 'vehicle' ||
      lower === 'device' ||
      lower.endsWith('.vehicle') ||
      lower.endsWith('.device')
    ) {
      return `${fieldName}.${attributePath}`;
    }
    const dot = fieldName.lastIndexOf('.');
    if (dot > 0) {
      return `${fieldName.slice(0, dot)}.${attributePath}`;
    }
    return `${fieldName}.${attributePath}`;
  }
  return `${fieldName}.${attributePath}`;
}
