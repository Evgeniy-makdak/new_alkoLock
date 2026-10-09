import { resolveComposeColumnApiField } from './buildReportSortParam';
import { findReportTableFieldDefinition } from './buildReportTableFieldOptions';
import { isEventsForFrontTypeListAttribute } from './eventsForFrontReportOptions';
import {
  isReportCoordinatesCompositePath,
  expandCoordinatesCompositeFieldPath,
} from './reportCoordinateComposite';
import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
  parseCompositePath,
} from './reportEntityCompositeFields';
import { reportOutputFunctionKey } from './reportOutputFilterKeys';
import { getPrimaryOutputRowFromList } from './reportOutputRow';

import {
  buildReportLogicConnects,
  reportFilterGroupNumberForRowIndex,
} from './reportFilterGroupNumber';

import type { ReportComposeGroupRow } from '../types/reportComposeGroup';
import { createReportComposeGroupRow } from '../types/reportComposeGroup';
import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFieldOperation,
  ReportHavingFilter,
  ReportLogicConnect,
  ReportLogicOperator,
  ReportOutputRow,
  ReportQueryRequest,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';
import type { Values } from '@shared/ui/search_multiple_select';

const AGGREGATION_PREFERENCE = ['COUNT', 'MAX', 'MIN', 'SUM', 'AVG'] as const;

/** Enum aggregation из swagger having (lowercase). */
export const REPORT_HAVING_AGGREGATION_CODES = [
  'none',
  'count',
  'countDistinct',
  'sum',
  'avg',
  'min',
  'max',
] as const;

/** Enum havingMode из swagger. */
export const REPORT_HAVING_MODE_CODES = [
  'max_only',
  'min_only',
  'top_n',
  'above_avg',
  'comparison',
] as const;

/** Enum operator из swagger having. */
export const REPORT_HAVING_OPERATOR_CODES = [
  'eq',
  'ne',
  'isNull',
  'isNotNull',
  'contains',
  'startsWith',
  'endsWith',
  'isEmpty',
  'isNotEmpty',
  'gt',
  'gte',
  'lt',
  'lte',
  'between',
  'after',
  'before',
  'in',
  'notIn',
] as const;

const HAVING_OPERATORS_WITHOUT_VALUES = new Set([
  'isnull',
  'isnotnull',
  'isempty',
  'isnotempty',
]);

function codesToFieldOperations(codes: readonly string[]): ReportFieldOperation[] {
  return codes.map((code) => ({ code, label: code }));
}

function filterHavingOps(list: ReportFieldOperation[] | null | undefined): ReportFieldOperation[] {
  return (list ?? []).filter((item) => item?.code);
}

/**
 * Операторы having:
 * 1) availableHaving.availableHavingOperations
 * 2) availableOperations (legacy)
 * 3) enum swagger
 */
export function getReportHavingOperatorOptions(
  fieldDef: ReportFieldDefinition | null | undefined,
): ReportFieldOperation[] {
  const fromHaving = filterHavingOps(fieldDef?.availableHaving?.availableHavingOperations);
  if (fromHaving.length) return fromHaving;
  const fromLegacy = filterHavingOps(fieldDef?.availableOperations);
  return fromLegacy.length ? fromLegacy : codesToFieldOperations(REPORT_HAVING_OPERATOR_CODES);
}

/**
 * Агрегации having:
 * 1) availableHaving.functions
 * 2) availableFunctions (legacy)
 * 3) enum swagger
 */
export function getReportHavingAggregationOptions(
  fieldDef: ReportFieldDefinition | null | undefined,
): ReportFieldOperation[] {
  const fromHaving = filterHavingOps(fieldDef?.availableHaving?.functions);
  if (fromHaving.length) return fromHaving;
  const fromLegacy = filterHavingOps(fieldDef?.availableFunctions);
  return fromLegacy.length ? fromLegacy : codesToFieldOperations(REPORT_HAVING_AGGREGATION_CODES);
}

/**
 * Режим having:
 * 1) availableHaving.modes
 * 2) enum swagger
 */
export function getReportHavingModeOptions(
  fieldDef: ReportFieldDefinition | null | undefined,
): ReportFieldOperation[] {
  const fromHaving = filterHavingOps(fieldDef?.availableHaving?.modes);
  return fromHaving.length ? fromHaving : codesToFieldOperations(REPORT_HAVING_MODE_CODES);
}

/** Нормализация aggregation → swagger: none|count|countDistinct|sum|avg|min|max */
export function normalizeHavingAggregationForApi(code: string): string | undefined {
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  const key = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  const compact = key.replace(/_/g, '');
  const aliases: Record<string, string> = {
    none: 'none',
    count: 'count',
    countdistinct: 'countDistinct',
    count_distinct: 'countDistinct',
    sum: 'sum',
    avg: 'avg',
    average: 'avg',
    min: 'min',
    max: 'max',
  };
  return aliases[key] ?? aliases[compact] ?? trimmed.toLowerCase();
}

/** Нормализация havingMode → swagger enum. */
export function normalizeHavingModeForApi(code: string): string | undefined {
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  const key = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    max_only: 'max_only',
    min_only: 'min_only',
    mix_only: 'min_only',
    top_n: 'top_n',
    top: 'top_n',
    above_avg: 'above_avg',
    above_average: 'above_avg',
    comparison: 'comparison',
  };
  return aliases[key] ?? key;
}

/** Нормализация operator → lowercase swagger-код. */
export function normalizeHavingOperatorForApi(code: string): string | undefined {
  const trimmed = code.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  // isNull / startsWith сохраняем camelCase как в swagger
  const aliases: Record<string, string> = {
    eq: 'eq',
    ne: 'ne',
    isnull: 'isNull',
    is_not_null: 'isNotNull',
    isnotnull: 'isNotNull',
    contains: 'contains',
    startswith: 'startsWith',
    starts_with: 'startsWith',
    endswith: 'endsWith',
    ends_with: 'endsWith',
    isempty: 'isEmpty',
    is_empty: 'isEmpty',
    isnotempty: 'isNotEmpty',
    is_not_empty: 'isNotEmpty',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte',
    between: 'between',
    after: 'after',
    before: 'before',
    in: 'in',
    notin: 'notIn',
    not_in: 'notIn',
  };
  const compact = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
  return aliases[trimmed.toLowerCase()] ?? aliases[compact] ?? lower;
}

export function havingOperatorNeedsValues(operator: string): boolean {
  const normalized = normalizeHavingOperatorForApi(operator);
  if (!normalized) return false;
  return !HAVING_OPERATORS_WITHOUT_VALUES.has(normalized.toLowerCase());
}

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

function havingByPrimaryField(
  having: ReportHavingFilter[] | undefined,
): Map<string, ReportHavingFilter> {
  const map = new Map<string, ReportHavingFilter>();
  for (const item of having ?? []) {
    const key = item.fieldName?.trim();
    if (!key || map.has(key)) continue;
    map.set(key, item);
  }
  return map;
}

function applyHavingToGroupRow(
  row: ReportComposeGroupRow,
  havingItem: ReportHavingFilter | undefined,
): ReportComposeGroupRow {
  if (!havingItem) return row;
  const values: Values = Array.isArray(havingItem.values)
    ? havingItem.values.map((value, index) => ({
        value: value as string | number,
        label: String(value ?? index),
      }))
    : [];
  return {
    ...row,
    operator: havingItem.operator?.trim() ?? '',
    havingAggregation: havingItem.aggregation?.trim() ?? '',
    havingMode: havingItem.havingMode?.trim() ?? '',
    topN: havingItem.topN != null && Number.isFinite(havingItem.topN) ? String(havingItem.topN) : '',
    values,
  };
}

/** groupBy (+ having) из сформированного отчёта → строки формы (режим редактирования). */
export function parseComposeGroupRowsFromGroupBy(
  groupBy: string[] | undefined,
  columnKeys: Values,
  having?: ReportHavingFilter[],
): ReportComposeGroupRow[] {
  const groupByList = (groupBy ?? []).map((field) => field.trim()).filter(Boolean);
  if (!groupByList.length) return [];

  const remaining = new Set(groupByList);
  const rows: ReportComposeGroupRow[] = [];
  const havingMap = havingByPrimaryField(having);

  const compositeColumnKeys = columnKeys
    .map((item) => String(item.value))
    .filter((key) => isReportCompositeFieldPath(key))
    .sort(
      (a, b) => resolveComposeGroupApiFields(b).length - resolveComposeGroupApiFields(a).length,
    );

  for (const columnKey of compositeColumnKeys) {
    const members = resolveComposeGroupApiFields(columnKey);
    if (!members.length || !members.every((member) => remaining.has(member))) continue;
    const primary = members[0];
    rows.push(applyHavingToGroupRow(createReportComposeGroupRow(columnKey), havingMap.get(primary)));
    for (const member of members) remaining.delete(member);
  }

  for (const apiField of groupByList) {
    if (!remaining.has(apiField)) continue;
    const columnKey = findComposeGroupColumnKey(apiField, columnKeys);
    rows.push(applyHavingToGroupRow(createReportComposeGroupRow(columnKey), havingMap.get(apiField)));
    remaining.delete(apiField);
  }

  return rows;
}

function rowHasHavingSelections(row: ReportComposeGroupRow): boolean {
  return Boolean(
    row.operator.trim() ||
      row.havingAggregation.trim() ||
      row.havingMode.trim() ||
      row.topN.trim() ||
      row.values.length,
  );
}

/**
 * Строки группировки → having в теле POST …/query.
 * Элемент добавляется только если в карточке выбраны параметры having
 * (operator / aggregation / havingMode / topN / values).
 * group — попарно, как у filters: строки 0–1 → 1, 2–3 → 2, …
 * Коды приводятся к enum swagger (aggregation lowercase, havingMode, operator).
 */
export function buildComposeHavingParams(
  rows: ReportComposeGroupRow[],
  columnLabelByKey?: Map<string, string>,
): ReportHavingFilter[] {
  const result: ReportHavingFilter[] = [];

  rows.forEach((row, index) => {
    if (!row.columnKey.trim() || !rowHasHavingSelections(row)) return;
    const apiFields = resolveComposeGroupApiFields(row.columnKey);
    const fieldName = apiFields[0] ?? resolveComposeColumnApiField(row.columnKey);
    if (!fieldName) return;

    const item: ReportHavingFilter = {
      fieldName,
      group: reportFilterGroupNumberForRowIndex(index),
    };

    const aggregation = normalizeHavingAggregationForApi(row.havingAggregation);
    if (aggregation) item.aggregation = aggregation;

    const havingMode = normalizeHavingModeForApi(row.havingMode);
    if (havingMode) item.havingMode = havingMode;

    // topN только для havingMode = top_n; всегда integer, не строка
    if (havingMode === 'top_n') {
      const topNRaw = row.topN.trim();
      if (topNRaw !== '') {
        const topN = Number.parseInt(topNRaw, 10);
        if (Number.isFinite(topN)) {
          item.topN = topN;
        }
      }
    }

    // operator + values — только для comparison (не для max_only / top_n / …)
    if (havingMode === 'comparison') {
      const operator = normalizeHavingOperatorForApi(row.operator);
      if (operator) item.operator = operator;

      const cleanedValues = row.values
        .map((v) => v.value)
        .filter((value) => value !== '' && value != null);
      if (cleanedValues.length) {
        item.values = cleanedValues;
      }
    }

    const displayName = columnLabelByKey?.get(row.columnKey);
    if (displayName) item.displayName = displayName;

    result.push(item);
  });

  return result;
}

/**
 * Связи И/ИЛИ между парами having-групп — тот же контракт, что logicConnects у filters.
 * Считаем по числу карточек группировки с выбранным полем.
 */
export function buildComposeHavingConnects(
  rows: ReportComposeGroupRow[],
  logicOperator: ReportLogicOperator,
): ReportLogicConnect[] {
  const activeCount = rows.filter((row) => row.columnKey.trim()).length;
  return buildReportLogicConnects(activeCount, logicOperator);
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
  'BOOLEAN',
  'BOOL',
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

/**
 * Листья путей без metadata: enum/boolean и др. типы, для которых Hibernate не принимает max().
 * Используется при sanitize без контекста metadata.
 */
const LIKELY_NON_MAX_AGGREGATABLE_LEAVES = new Set([
  'color',
  'type',
  'level',
  'status',
  'state',
  'mode',
  'isActive',
  'active',
  'seen',
  'enabled',
  'disabled',
  'licenseClass',
  'licenseCode',
]);

function isEventsForFrontEnumLikePath(fieldName: string): boolean {
  const trimmed = fieldName.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) return false;
  const prefix = trimmed.slice(0, dot);
  const leaf = trimmed.slice(dot + 1);
  if (prefix !== 'eventsForFront' && !prefix.endsWith('.eventsForFront')) return false;
  return isEventsForFrontTypeListAttribute(leaf);
}

function isMaxAggregatableReportField(
  fieldName: string,
  fieldDef: ReportFieldDefinition | undefined,
): boolean {
  if (fieldDef?.type) {
    return isMaxAggregatableReportFieldType(fieldDef.type);
  }
  if (isEventsForFrontEnumLikePath(fieldName)) return false;
  const leaf = fieldName.slice(fieldName.lastIndexOf('.') + 1);
  return !LIKELY_NON_MAX_AGGREGATABLE_LEAVES.has(leaf);
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
    const canMax = isMaxAggregatableReportField(fieldName, fieldDef);
    const maxFallback = canMax ? 'MAX' : 'COUNT';
    const picked = pickAggregationForGroupedField(fieldDef, null, maxFallback);
    if (!canMax && normalizeAggregationCode(picked) === 'MAX') {
      return normalizeAggregationForApi('COUNT');
    }
    return normalizeAggregationForApi(picked);
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
 * При groupBy:
 * — дополняет groupBy соседними полями выбранной сущности;
 * — у полей из groupBy убирает aggregation (они в GROUP BY, не в SELECT agg);
 * — НЕ подставляет aggregation в selectedFields автоматически:
 *   aggregation в selectedFields задаёт только контрол «Текущий состав таблицы»;
 *   условия агрегации по группам — в having.
 */
export function finalizeReportQueryBodyForGroupBy(
  body: ReportQueryRequest,
  _context?: ApplyGroupByAggregationContext,
): ReportQueryRequest {
  const groupBy = body.groupBy;
  if (!groupBy?.length) return body;

  const effectiveGroupBy = augmentGroupByWithSiblingSelectedFields(groupBy, body.selectedFields);
  const groupSet = new Set(effectiveGroupBy);
  const deduped = dedupeSelectedFieldsByFieldName(body.selectedFields, groupSet);

  const selectedFields = deduped.map((field) => {
    if (!field.fieldName) return field;
    if (groupSet.has(field.fieldName)) {
      return stripSelectedFieldAggregation(field);
    }
    // Сохраняем aggregation только если пользователь выбрал её в «Текущий состав».
    return field;
  });

  return {
    ...body,
    groupBy: effectiveGroupBy,
    selectedFields,
    ...(body.having?.length ? { having: body.having } : {}),
  };
}

/** @deprecated Используйте finalizeReportQueryBodyForGroupBy */
export function applyGroupByAggregationRules(
  body: ReportQueryRequest,
  context: ApplyGroupByAggregationContext,
): ReportQueryRequest {
  return finalizeReportQueryBodyForGroupBy(body, context);
}
