import type { Values } from '@shared/ui/search_multiple_select';

import {
  buildDateTimeBetweenRange,
  formatFilterValueForField,
  toReportDateTimeFilterIso,
} from './formatReportDateTimeFilterValue';
import { isReportDateTimeField } from './reportFieldFilterKind';
import {
  reportOutputFunctionKey,
  reportOutputOperationKey,
} from './reportOutputFilterKeys';
import { isGroupFilterControlId } from './reportOutputRow';

import {
  findReportTableFieldDefinition,
  resolveReportTableSelectedPayloadFieldName,
} from './buildReportTableFieldOptions';
import { resolveNestedEntityFilterFieldName } from './resolveNestedEntityFilterFieldName';

import {
  buildReportLogicConnects,
  reportFilterGroupNumberForRowIndex,
} from './reportFilterGroupNumber';
import { getPrimaryOutputRowFromList } from './reportOutputRow';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFieldOperation,
  ReportLogicOperator,
  ReportNestedEntityFilterByField,
  ReportOutputRow,
  ReportQueryFilter,
  ReportQueryRequest,
  ReportQueryRowPayload,
  ReportSelectedFieldPayload,
  ReportUiFilterSelections,
} from '../types/reportApiTypes';

/** Код оператора из metadata как есть (контракт FilterOperator на бэке). */
function findOperationCode(field: ReportFieldDefinition, ...preferred: string[]): string | null {
  const ops = field.availableOperations ?? [];
  const lowerPreferred = preferred.map((p) => p.toLowerCase());
  for (const pref of lowerPreferred) {
    const hit = ops.find((o) => o.code.toLowerCase() === pref);
    if (hit) return hit.code;
  }
  return ops[0]?.code ?? null;
}

function pickOperator(field: ReportFieldDefinition | undefined, multi: boolean): string {
  if (!field?.availableOperations?.length) {
    return multi ? 'in' : 'eq';
  }
  const codes = field.availableOperations.map((o) => o.code.toLowerCase());
  if (multi && codes.includes('in')) {
    return field.availableOperations.find((o) => o.code.toLowerCase() === 'in')!.code;
  }
  if (multi && codes.includes('contains')) {
    return field.availableOperations.find((o) => o.code.toLowerCase() === 'contains')!.code;
  }
  if (!multi && codes.includes('eq')) {
    return field.availableOperations.find((o) => o.code.toLowerCase() === 'eq')!.code;
  }
  return field.availableOperations[0].code;
}

function resolveUiOperationCode(
  field: ReportFieldDefinition,
  filterSelections: ReportUiFilterSelections,
  operationKey: string,
  multi: boolean,
): string {
  const picked = filterSelections[operationKey]?.[0];
  if (picked?.value != null && picked.value !== '') {
    const code = String(picked.value);
    const allowed = field.availableOperations?.some((o) => o.code === code);
    if (allowed) return code;
  }
  return pickOperator(field, multi);
}

function buildDateTimeFilterWithOp(
  field: ReportFieldDefinition,
  selected: Values,
  operatorCode: string,
): ReportQueryFilter | null {
  const iso = toReportDateTimeFilterIso(selected.length === 1 ? selected[0].value : selected);
  if (!iso) {
    return null;
  }

  const opLower = operatorCode.toLowerCase();

  if (opLower === 'between') {
    const betweenCode = findOperationCode(field, 'between');
    if (betweenCode) {
      const range = buildDateTimeBetweenRange(iso);
      if (range) {
        return {
          fieldName: field.fieldName,
          operator: betweenCode,
          value: range,
        };
      }
    }
  }

  const resolvedOp = findOperationCode(field, opLower) ?? operatorCode;
  return {
    fieldName: field.fieldName,
    operator: resolvedOp,
    value: formatFilterValueForField(field, iso),
  };
}

function resolveFilterValue(field: ReportFieldDefinition | undefined, selected: Values): unknown {
  const raw = valuesToFilterValue(selected);
  if (Array.isArray(raw)) {
    return raw.map((v) => formatFilterValueForField(field, v));
  }
  return formatFilterValueForField(field, raw);
}

function valuesToFilterValue(selected: Values): unknown {
  if (selected.length === 1) {
    return coerceFilterScalar(selected[0].value);
  }
  return selected.map((v) => coerceFilterScalar(v.value));
}

function coerceFilterScalar(raw: unknown): unknown {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw;
  }
  const num = Number(raw);
  if (Number.isFinite(num) && String(num) === String(raw)) {
    return num;
  }
  return raw;
}

export function operationsToValues(ops: ReportFieldOperation[] | undefined): Values {
  return (ops ?? []).map((o) => ({ value: o.code, label: o.label || o.code }));
}

function toSelectedFieldPayload(
  field: ReportFieldDefinition,
  filterSelections: ReportUiFilterSelections,
  functionKey: string,
): ReportSelectedFieldPayload {
  const payload: ReportSelectedFieldPayload = { fieldName: field.fieldName };
  if (field.alias) {
    payload.alias = field.alias;
  }
  const fnPick = filterSelections[functionKey]?.[0];
  const fnCode = fnPick?.value != null && fnPick.value !== '' ? String(fnPick.value) : null;
  if (fnCode) {
    const allowed = field.availableFunctions?.some((f) => f.code === fnCode);
    if (allowed) {
      payload.aggregation = fnCode;
    }
  }
  if (!payload.aggregation && field.aggregation?.trim()) {
    payload.aggregation = field.aggregation.trim();
  }
  return payload;
}

type BuildRowReportTableFieldsContext = {
  entityMetadata: ReportEntityMetadata;
  outputRows: ReportOutputRow[];
  fieldMap: Map<string, ReportFieldDefinition>;
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>;
};

function buildRowReportTableFields(
  row: ReportOutputRow,
  context: BuildRowReportTableFieldsContext,
): ReportSelectedFieldPayload[] {
  const functionKey = reportOutputFunctionKey(row.id);
  const fnPick = row.filterSelections[functionKey]?.[0];
  const fnCode = fnPick?.value != null && fnPick.value !== '' ? String(fnPick.value) : null;

  return row.reportTableFields.map((item) => {
    const path = String(item.value);
    const fieldDef = findReportTableFieldDefinition(
      path,
      context.entityMetadata,
      context.outputRows,
      context.fieldMap,
      context.tableMetadataByRowId,
    );
    const defaultLabel = (fieldDef?.label ?? '').trim() || path;
    const displayLabel = (item.label ?? '').trim() || defaultLabel;
    const payload: ReportSelectedFieldPayload = {
      fieldName: resolveReportTableSelectedPayloadFieldName(path),
    };
    if (displayLabel !== defaultLabel) {
      payload.alias = displayLabel;
    } else if (fieldDef?.alias?.trim()) {
      payload.alias = fieldDef.alias.trim();
    }
    if (fnCode) {
      payload.aggregation = fnCode;
    }
    return payload;
  });
}

function mergeSelectedFields(payloads: ReportSelectedFieldPayload[][]): ReportSelectedFieldPayload[] {
  const merged: ReportSelectedFieldPayload[] = [];
  const seen = new Set<string>();
  for (const list of payloads) {
    for (const item of list) {
      const key = `${item.fieldName}:${item.alias ?? ''}:${item.aggregation ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

type RowQueryBuildOptions = {
  includeGroupFilters: boolean;
  groupNumber?: number;
};

function withFilterGroup(filter: ReportQueryFilter, groupNumber?: number): ReportQueryFilter {
  if (groupNumber === undefined) {
    return filter;
  }
  return { ...filter, group: groupNumber };
}

/** Собирает selectedFields и filters для одной строки «поле результата». */
export function buildReportQueryRequestForRow(
  metadata: ReportEntityMetadata,
  row: ReportOutputRow,
  options: RowQueryBuildOptions,
  tableFieldsContext: BuildRowReportTableFieldsContext,
): ReportQueryRowPayload | null {
  const primaryKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
  const fieldMap = tableFieldsContext.fieldMap;
  const primary = primaryKey ? fieldMap.get(primaryKey) : undefined;
  if (!primary) {
    return null;
  }

  const operationKey = reportOutputOperationKey(row.id);
  const selectedFields = buildRowReportTableFields(row, tableFieldsContext);
  const filters: ReportQueryFilter[] = [];

  const pushFilter = (fieldName: string, selected: Values, field?: ReportFieldDefinition) => {
    if (!selected.length) return;

    if (field && isReportDateTimeField(field)) {
      const multi = selected.length > 1;
      const opCode = resolveUiOperationCode(field, row.filterSelections, operationKey, multi);
      const dtFilter = buildDateTimeFilterWithOp(field, selected, opCode);
      if (dtFilter) {
        filters.push(withFilterGroup(dtFilter, options.groupNumber));
      }
      return;
    }

    const multi = selected.length > 1;
    const operator = resolveUiOperationCode(
      field ?? primary,
      row.filterSelections,
      operationKey,
      multi,
    );
    filters.push(
      withFilterGroup(
        {
          fieldName,
          operator,
          value: resolveFilterValue(field, selected),
        },
        options.groupNumber,
      ),
    );
  };

  if (primary.filterable) {
    const ref = primary.referenceEntity?.trim();
    if (ref) {
      const nested = row.nestedEntityFilterByField[primary.fieldName];
      if (nested?.attribute && nested.values.length) {
        pushFilter(
          resolveNestedEntityFilterFieldName(primary, nested.attribute),
          nested.values,
          primary,
        );
      }
    } else {
      const selected = row.filterSelections[primary.fieldName] ?? [];
      if (selected.length) {
        pushFilter(primary.fieldName, selected, primary);
      }
    }
  }

  if (options.includeGroupFilters) {
    for (const [controlId, selected] of Object.entries(row.filterSelections)) {
      if (!selected?.length || !isGroupFilterControlId(controlId)) continue;

      if (controlId === '__group_eventType') {
        pushFilter('eventsForFront.event', selected);
        continue;
      }
      if (controlId === '__group_email') {
        pushFilter('email', selected);
        continue;
      }

      pushFilter(controlId, selected, fieldMap.get(controlId));
    }
  }

  return { selectedFields, filters };
}

/** Общие фильтры сущности (тип события, e-mail и т.д.) — только первая строка UI. */
function buildSharedGroupFilters(
  metadata: ReportEntityMetadata,
  row: ReportOutputRow,
): ReportQueryFilter[] {
  const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
  const filters: ReportQueryFilter[] = [];

  const pushFilter = (fieldName: string, selected: Values, field?: ReportFieldDefinition) => {
    if (!selected.length) return;
    const multi = selected.length > 1;
    const operator = pickOperator(field, multi);
    filters.push({
      fieldName,
      operator,
      value: resolveFilterValue(field, selected),
    });
  };

  for (const [controlId, selected] of Object.entries(row.filterSelections)) {
    if (!selected?.length || !isGroupFilterControlId(controlId)) continue;

    if (controlId === '__group_eventType') {
      pushFilter('eventsForFront.event', selected);
      continue;
    }
    if (controlId === '__group_email') {
      pushFilter('email', selected);
      continue;
    }

    pushFilter(controlId, selected, fieldMap.get(controlId));
  }

  return filters;
}

export function buildReportQueryRequest(params: {
  metadata: ReportEntityMetadata;
  outputRows: ReportOutputRow[];
  logicOperator?: ReportLogicOperator;
  reportTableFieldsMetadataByRowId?: Record<string, ReportEntityMetadata | null>;
}): ReportQueryRequest {
  const { metadata, outputRows, logicOperator = 'or', reportTableFieldsMetadataByRowId = {} } =
    params;
  const primaryRow = getPrimaryOutputRowFromList(outputRows);
  const activeRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);

  if (!activeRows.length) {
    return { selectedFields: [], filters: [] };
  }

  const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));
  const tableFieldsContext: BuildRowReportTableFieldsContext = {
    entityMetadata: metadata,
    outputRows: activeRows,
    fieldMap,
    tableMetadataByRowId: reportTableFieldsMetadataByRowId,
  };

  if (activeRows.length === 1) {
    const single = buildReportQueryRequestForRow(metadata, activeRows[0], {
      includeGroupFilters: activeRows[0].id === primaryRow.id,
      groupNumber: reportFilterGroupNumberForRowIndex(0),
    }, tableFieldsContext);
    if (!single) {
      return { selectedFields: [], filters: [] };
    }
    return {
      selectedFields: single.selectedFields,
      filters: single.filters,
    };
  }

  const filters: ReportQueryFilter[] = [];
  const selectedFieldLists: ReportSelectedFieldPayload[][] = [];

  activeRows.forEach((row, rowIndex) => {
    const rowPayload = buildReportQueryRequestForRow(
      metadata,
      row,
      {
        includeGroupFilters: false,
        groupNumber: reportFilterGroupNumberForRowIndex(rowIndex),
      },
      tableFieldsContext,
    );
    if (!rowPayload) return;
    filters.push(...rowPayload.filters);
    selectedFieldLists.push(rowPayload.selectedFields);
  });

  const primaryRowIndex = activeRows.findIndex((row) => row.id === primaryRow.id);
  if (primaryRowIndex >= 0) {
    for (const sharedFilter of buildSharedGroupFilters(metadata, primaryRow)) {
      filters.push(
        withFilterGroup(sharedFilter, reportFilterGroupNumberForRowIndex(primaryRowIndex)),
      );
    }
  }

  return {
    selectedFields: mergeSelectedFields(selectedFieldLists),
    filters,
    logicConnects: buildReportLogicConnects(activeRows.length, logicOperator),
  };
}
