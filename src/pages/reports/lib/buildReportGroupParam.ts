import { resolveComposeColumnApiField } from './buildReportSortParam';
import { findReportTableFieldDefinition } from './buildReportTableFieldOptions';
import {
  isReportCoordinatesCompositePath,
  expandCoordinatesCompositeFieldPath,
} from './reportCoordinateComposite';
import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
  parseCompositePath,
  stripUngroupedCompositeMemberFields,
} from './reportEntityCompositeFields';
import { reportOutputFunctionKey } from './reportOutputFilterKeys';
import { getPrimaryOutputRowFromList } from './reportOutputRow';

import type { ReportComposeGroupRow } from '../types/reportComposeGroup';
import { createReportComposeGroupRow } from '../types/reportComposeGroup';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
  ReportQueryRequest,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

const AGGREGATION_PREFERENCE = ['COUNT', 'MAX', 'MIN', 'SUM', 'AVG'] as const;

/** UI-ключ колонки → все fieldName для groupBy (составная колонка → все её поля). */
export function resolveComposeGroupApiFields(columnKey: string): string[] {
  const key = columnKey.trim();
  if (!key) return [];
  if (isReportCompositeFieldPath(key)) {
    return expandCompositeFieldPath(key).filter(Boolean);
  }
  return [key];
}

/** Строки группировки из формы → groupBy в теле POST …/query. */
export function buildComposeGroupParams(rows: Pick<ReportComposeGroupRow, 'columnKey'>[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const row of rows) {
    for (const apiField of resolveComposeGroupApiFields(row.columnKey)) {
      if (!apiField || seen.has(apiField)) continue;
      seen.add(apiField);
      result.push(apiField);
    }
  }

  return result;
}

function findComposeGroupColumnKey(apiField: string, columnKeys: Values): string {
  for (const item of columnKeys) {
    const key = String(item.value);
    if (resolveComposeColumnApiField(key) === apiField) {
      return key;
    }
  }
  for (const item of columnKeys) {
    const key = String(item.value);
    if (key === apiField) {
      return key;
    }
  }
  return apiField;
}

/** groupBy из сформированного отчёта → строки формы (режим редактирования). */
export function parseComposeGroupRowsFromGroupBy(
  groupBy: string[] | undefined,
  columnKeys: Values,
): ReportComposeGroupRow[] {
  const groupByList = (groupBy ?? []).map((field) => field.trim()).filter(Boolean);
  if (!groupByList.length) return [];

  const remaining = new Set(groupByList);
  const rows: ReportComposeGroupRow[] = [];

  const compositeColumnKeys = columnKeys
    .map((item) => String(item.value))
    .filter((key) => isReportCompositeFieldPath(key))
    .sort(
      (a, b) => resolveComposeGroupApiFields(b).length - resolveComposeGroupApiFields(a).length,
    );

  for (const columnKey of compositeColumnKeys) {
    const members = resolveComposeGroupApiFields(columnKey);
    if (!members.length || !members.every((member) => remaining.has(member))) continue;
    rows.push(createReportComposeGroupRow(columnKey));
    for (const member of members) remaining.delete(member);
  }

  for (const apiField of groupByList) {
    if (!remaining.has(apiField)) continue;
    rows.push(createReportComposeGroupRow(findComposeGroupColumnKey(apiField, columnKeys)));
    remaining.delete(apiField);
  }

  return rows;
}

function isColumnGroupableForGroupBy(
  path: string,
  entityMetadata: ReportEntityMetadata,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): boolean {
  if (isReportCoordinatesCompositePath(path)) {
    return expandCoordinatesCompositeFieldPath(path).every((member) => {
      const fieldDef = findReportTableFieldDefinition(
        member,
        entityMetadata,
        outputRows,
        fieldMap,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
      );
      return fieldDef?.groupable === true;
    });
  }

  if (isReportCompositeFieldPath(path)) {
    const parsed = parseCompositePath(path);
    if (!parsed || parsed.kind === 'Coordinates') return false;

    const prefix = parsed.prefix.trim();
    if (!prefix) {
      return entityMetadata.fields.some(
        (field) =>
          field.type === 'ENTITY' &&
          field.groupable &&
          (field.referenceEntity === parsed.kind ||
            (field.referenceEntity === 'Driver' && parsed.kind === 'User')),
      );
    }

    const relationDef = findReportTableFieldDefinition(
      prefix,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    );
    if (relationDef?.type === 'ENTITY') return relationDef.groupable === true;

    const parentDot = prefix.lastIndexOf('.');
    if (parentDot >= 0) {
      const parentPath = prefix.slice(0, parentDot);
      const parentDef = findReportTableFieldDefinition(
        parentPath,
        entityMetadata,
        outputRows,
        fieldMap,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
      );
      if (parentDef?.type === 'ENTITY') return parentDef.groupable === true;
    }

    return relationDef?.groupable === true;
  }

  const fieldDef = findReportTableFieldDefinition(
    path,
    entityMetadata,
    outputRows,
    fieldMap,
    tableMetadataByRowId,
    referenceEntityMetadataByName,
  );
  if (fieldDef?.groupable === true) return true;

  const dot = path.lastIndexOf('.');
  if (dot > 0) {
    const relationPath = path.slice(0, dot);
    const relationDef = findReportTableFieldDefinition(
      relationPath,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    );
    if (relationDef?.type === 'ENTITY' && relationDef.groupable) return true;
  }

  return false;
}

/** Колонки «Текущий состав», по которым metadata разрешает groupBy. */
export function buildGroupableColumnOptions(
  columnOptions: Values,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): Values {
  if (!entityMetadata) return [];

  return columnOptions.filter((option) => {
    const path = String(option.value);
    if (!path) return false;

    return isColumnGroupableForGroupBy(
      path,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    );
  });
}

const NON_MAX_AGGREGATABLE_FIELD_TYPES = new Set([
  'ENUM',
  'JSON',
  'BLOB',
  'BINARY',
  'VARBINARY',
  'BYTEA',
  'IMAGE',
  'ENTITY',
]);

function normalizeAggregationCode(code: string): string {
  return code.trim().toUpperCase();
}

function isMaxAggregatableReportFieldType(type: string | undefined): boolean {
  if (!type) return true;
  return !NON_MAX_AGGREGATABLE_FIELD_TYPES.has(type.toUpperCase());
}

function isMaxAggregatableReportField(
  fieldName: string,
  fieldDef: ReportFieldDefinition | undefined,
): boolean {
  if (fieldDef?.type) {
    return isMaxAggregatableReportFieldType(fieldDef.type);
  }
  const leaf = fieldName.slice(fieldName.lastIndexOf('.') + 1);
  return leaf !== 'color' && leaf !== 'type';
}

function collectEntityPrefixesFromGroupBy(groupBy: string[]): Set<string> {
  const prefixes = new Set<string>();
  for (const field of groupBy) {
    const dot = field.lastIndexOf('.');
    if (dot > 0) {
      prefixes.add(field.slice(0, dot));
    }
  }
  return prefixes;
}

/**
 * Если в groupBy уже есть поля сущности (vehicleBind.vehicle.*), остальные выбранные поля
 * того же префикса тоже включаем в GROUP BY — иначе Hibernate пытается max(enum) и падает.
 */
export function augmentGroupByWithSiblingSelectedFields(
  groupBy: string[],
  selectedFields: ReportSelectedFieldPayload[],
): string[] {
  const prefixes = collectEntityPrefixesFromGroupBy(groupBy);
  if (!prefixes.size) return groupBy;

  const groupSet = new Set(groupBy);
  const augmented = [...groupBy];

  for (const field of selectedFields) {
    const name = field.fieldName?.trim();
    if (!name || groupSet.has(name)) continue;

    const dot = name.lastIndexOf('.');
    if (dot <= 0) continue;

    const prefix = name.slice(0, dot);
    if (!prefixes.has(prefix)) continue;

    augmented.push(name);
    groupSet.add(name);
  }

  return augmented;
}

/** Бэкенд отчётов применяет агрегаты в нижнем регистре (count работает, MAX — нет). */
function normalizeAggregationForApi(code: string): string {
  return code.trim().toLowerCase();
}

function pickAggregationForGroupedField(
  fieldDef: ReportFieldDefinition | undefined,
  globalAggregation: string | null,
  fallback: (typeof AGGREGATION_PREFERENCE)[number] = 'COUNT',
): string {
  if (globalAggregation) return globalAggregation;

  const functions = fieldDef?.availableFunctions ?? [];
  const preferredOrder = [
    fallback,
    ...AGGREGATION_PREFERENCE.filter((code) => code !== fallback),
  ] as const;
  for (const preferred of preferredOrder) {
    const hit = functions.find((fn) => normalizeAggregationCode(fn.code) === preferred);
    if (hit?.code) return hit.code;
  }
  if (functions[0]?.code) return functions[0].code;
  if (fieldDef?.aggregation) return fieldDef.aggregation;
  return fallback;
}

function isNestedReportFieldName(fieldName: string): boolean {
  return fieldName.includes('.');
}

function dedupeSelectedFieldsByFieldName(
  fields: ReportSelectedFieldPayload[],
  groupSet: Set<string>,
): ReportSelectedFieldPayload[] {
  const byName = new Map<string, ReportSelectedFieldPayload>();

  for (const field of fields) {
    const name = field.fieldName?.trim();
    if (!name) continue;

    const existing = byName.get(name);
    if (!existing) {
      byName.set(name, field);
      continue;
    }

    const inGroup = groupSet.has(name);
    if (inGroup) {
      if (existing.aggregation && !field.aggregation) {
        byName.set(name, field);
      }
      continue;
    }

    if (!existing.aggregation && field.aggregation) {
      byName.set(name, field);
    }
  }

  return Array.from(byName.values());
}

function resolveAggregationForGroupedField(
  field: ReportSelectedFieldPayload,
  fieldDef: ReportFieldDefinition | undefined,
  globalAggregation: string | null,
): string {
  const fieldName = field.fieldName ?? '';
  const nested = isNestedReportFieldName(fieldName);

  if (nested) {
    const maxFallback = isMaxAggregatableReportField(fieldName, fieldDef) ? 'MAX' : 'COUNT';
    return normalizeAggregationForApi(pickAggregationForGroupedField(fieldDef, null, maxFallback));
  }

  if (field.aggregation) {
    return normalizeAggregationForApi(field.aggregation);
  }

  const globalNormalized = globalAggregation
    ? normalizeAggregationForApi(globalAggregation)
    : null;
  return normalizeAggregationForApi(
    pickAggregationForGroupedField(fieldDef, globalNormalized, 'COUNT'),
  );
}

function stripSelectedFieldAggregation(
  field: ReportSelectedFieldPayload,
): ReportSelectedFieldPayload {
  if (!field.aggregation) return field;
  const { aggregation: _removed, ...rest } = field;
  return rest;
}

type ApplyGroupByAggregationContext = {
  metadata: ReportEntityMetadata;
  outputRows: ReportOutputRow[];
  fieldMap: Map<string, ReportFieldDefinition>;
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
};

function readGlobalAggregationFromOutputRows(outputRows: ReportOutputRow[]): string | null {
  const primaryRow = getPrimaryOutputRowFromList(outputRows);
  const fnPick = primaryRow.filterSelections[reportOutputFunctionKey(primaryRow.id)]?.[0];
  return fnPick?.value != null && fnPick.value !== '' ? String(fnPick.value) : null;
}

/**
 * При groupBy все поля вне группировки должны иметь aggregation (требование SQL GROUP BY).
 * Поля из groupBy — без aggregation. Вложенные пути (branch.name) — MAX, не COUNT.
 */
export function finalizeReportQueryBodyForGroupBy(
  body: ReportQueryRequest,
  context?: ApplyGroupByAggregationContext,
): ReportQueryRequest {
  const groupBy = body.groupBy;
  if (!groupBy?.length) return body;

  const globalAggregation = context ? readGlobalAggregationFromOutputRows(context.outputRows) : null;
  const withoutIncoherentComposites = stripUngroupedCompositeMemberFields(
    body.selectedFields,
    groupBy,
  );
  const effectiveGroupBy = augmentGroupByWithSiblingSelectedFields(
    groupBy,
    withoutIncoherentComposites,
  );
  const groupSet = new Set(effectiveGroupBy);
  const deduped = dedupeSelectedFieldsByFieldName(withoutIncoherentComposites, groupSet);

  const aggregatableFields = deduped.filter((field) => {
    if (!field.fieldName || groupSet.has(field.fieldName)) return true;
    if (!field.fieldName.includes('.')) return true;

    const fieldDef = context
      ? findReportTableFieldDefinition(
          field.fieldName,
          context.metadata,
          context.outputRows,
          context.fieldMap,
          context.tableMetadataByRowId,
          context.referenceEntityMetadataByName,
        )
      : undefined;

    return isMaxAggregatableReportField(field.fieldName, fieldDef);
  });

  const selectedFields = aggregatableFields.map((field) => {
    if (!field.fieldName) return field;

    if (groupSet.has(field.fieldName)) {
      return stripSelectedFieldAggregation(field);
    }

    const fieldDef = context
      ? findReportTableFieldDefinition(
          field.fieldName,
          context.metadata,
          context.outputRows,
          context.fieldMap,
          context.tableMetadataByRowId,
          context.referenceEntityMetadataByName,
        )
      : undefined;

    return {
      ...field,
      aggregation: resolveAggregationForGroupedField(field, fieldDef, globalAggregation),
    };
  });

  return { ...body, groupBy: effectiveGroupBy, selectedFields };
}

/** @deprecated Используйте finalizeReportQueryBodyForGroupBy */
export function applyGroupByAggregationRules(
  body: ReportQueryRequest,
  context: ApplyGroupByAggregationContext,
): ReportQueryRequest {
  return finalizeReportQueryBodyForGroupBy(body, context);
}
