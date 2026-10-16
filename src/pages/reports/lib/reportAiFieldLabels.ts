import type { TFunction } from 'i18next';

import {
  buildRootReportTableFieldOptions,
  mergeAllReportTableFieldOptions,
} from './buildReportTableFieldOptions';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
} from '../types/reportApiTypes';

/**
 * path → UI label для AI compose (те же подписи, что в «Текущем составе» вручную).
 * Только для AI-пути; ручной compose не использует.
 */
export function buildReportAiComposeLabelByPath(params: {
  metadata: ReportEntityMetadata | null | undefined;
  outputRows?: ReportOutputRow[];
  reportTableFieldsMetadataByRowId?: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataByName?: Record<string, ReportEntityMetadata | null>;
  entities?: ReportEntityListItem[];
  t?: TFunction;
}): Record<string, string> {
  const {
    metadata,
    outputRows = [],
    reportTableFieldsMetadataByRowId = {},
    referenceEntityMetadataByName = {},
    entities = [],
    t,
  } = params;

  const map: Record<string, string> = {};
  if (!metadata) return map;

  const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
  const merged = mergeAllReportTableFieldOptions(
    metadata,
    outputRows,
    fieldMap,
    reportTableFieldsMetadataByRowId,
    referenceEntityMetadataByName,
    entities,
    t,
  );
  for (const opt of merged) {
    const key = String(opt.value ?? '').trim();
    const label = String(opt.label ?? '').trim();
    if (key && label) map[key] = label;
  }

  // Корневые поля (в т.ч. id при selectable=false) — как defaultRootTableFields.
  for (const opt of buildRootReportTableFieldOptions(metadata, outputRows, entities, t)) {
    const key = String(opt.value ?? '').trim();
    const label = String(opt.label ?? '').trim();
    if (key && label && !map[key]) map[key] = label;
  }

  // Fallback: сырой label из metadata, если пути не было в options.
  for (const field of metadata.fields) {
    const key = (field.fieldName ?? '').trim();
    if (!key || map[key]) continue;
    map[key] = (field.label ?? '').trim() || key;
  }

  return map;
}

/** Подпись поля filters[].fieldName (в т.ч. nested path) из metadata. */
export function resolveReportAiFilterFieldLabel(
  fieldName: string,
  metadata: ReportEntityMetadata | null | undefined,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
  composeLabels?: Record<string, string>,
): string {
  const path = fieldName.trim();
  if (!path) return '';
  if (composeLabels?.[path]) return composeLabels[path];

  const parts = path.split('.').filter(Boolean);
  if (!parts.length || !metadata) return path;

  // Точное совпадение корневого поля.
  const root = metadata.fields.find((f) => f.fieldName === path);
  if (root) return (root.label ?? '').trim() || path;

  // Nested: branch.id → «Офис -> Идентификатор» из label сегментов.
  const labels: string[] = [];
  let meta: ReportEntityMetadata | null | undefined = metadata;
  for (let i = 0; i < parts.length; i += 1) {
    const step = parts[i];
    const field: ReportFieldDefinition | undefined = meta?.fields?.find(
      (f) => f.fieldName === step,
    );
    if (!field) {
      labels.push(step);
      break;
    }
    labels.push((field.label ?? '').trim() || step);
    const ref = field.referenceEntity?.trim();
    if (i < parts.length - 1) {
      meta = ref ? (nestedByName[ref] ?? null) : null;
    }
  }
  return labels.join(' -> ') || path;
}

/** Подпись оператора из availableOperations листа (иначе код). */
export function resolveReportAiOperatorLabel(
  operator: string,
  fieldName: string,
  metadata: ReportEntityMetadata | null | undefined,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
): string {
  const code = (operator ?? '').trim();
  if (!code) return '';
  const leaf = resolveLeafFieldForFilterPath(fieldName, metadata, nestedByName);
  const ops = leaf?.availableOperations ?? [];
  const match =
    ops.find((op) => op.code === code) ??
    ops.find((op) => op.code.toLowerCase() === code.toLowerCase());
  return (match?.label ?? '').trim() || code;
}

function resolveLeafFieldForFilterPath(
  fieldName: string,
  metadata: ReportEntityMetadata | null | undefined,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
): ReportFieldDefinition | undefined {
  const path = fieldName.trim();
  if (!path || !metadata) return undefined;
  const parts = path.split('.').filter(Boolean);
  if (!parts.length) return undefined;

  let meta: ReportEntityMetadata | null | undefined = metadata;
  let field: ReportFieldDefinition | undefined;
  for (let i = 0; i < parts.length; i += 1) {
    field = meta?.fields?.find((f) => f.fieldName === parts[i]);
    if (!field) return undefined;
    if (i === parts.length - 1) return field;
    const ref = field.referenceEntity?.trim();
    meta = ref ? (nestedByName[ref] ?? null) : null;
  }
  return field;
}
