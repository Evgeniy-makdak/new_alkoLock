import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFieldOperation,
  ReportLogicOperator,
  ReportOutputRow,
  ReportQueryFilter,
  ReportQueryRequest,
  ReportQueryRowPayload,
  ReportSelectedFieldPayload,
  ReportUiFilterSelections,
} from '../types/reportApiTypes';
import {
  QUALIFIED_LABEL_SEPARATOR,
  findReportTableFieldDefinition,
  resolveReportFilterFieldName,
  resolveReportTableSelectedPayloadFieldName,
} from './buildReportTableFieldOptions';
import { findReferenceEntityFieldByAttribute } from './findReferenceEntityFieldByAttribute';
import {
  formatFilterValueForField,
  toReportDateTimeFilterIso,
} from './formatReportDateTimeFilterValue';
import {
  isReportDateTimeBetweenOperation,
  isReportFilterNullOperation,
} from './mapReportQueryOperator';
import { isReportDateTimeField } from './reportFieldFilterKind';
import {
  buildReportLogicConnects,
  reportFilterGroupNumberForRowIndex,
} from './reportFilterGroupNumber';
import { reportOutputFunctionKey, reportOutputOperationKey } from './reportOutputFilterKeys';
import { isGroupFilterControlId } from './reportOutputRow';
import { getPrimaryOutputRowFromList } from './reportOutputRow';
import { resolveNestedEntityFilterFieldName } from './resolveNestedEntityFilterFieldName';

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

function resolveFilterFieldDef(
  fieldName: string,
  field: ReportFieldDefinition | undefined,
  fieldMap: Map<string, ReportFieldDefinition>,
): ReportFieldDefinition | undefined {
  if (field) {
    return field;
  }
  const leaf = fieldName.includes('.')
    ? fieldName.slice(fieldName.lastIndexOf('.') + 1)
    : fieldName;
  return fieldMap.get(leaf) ?? fieldMap.get(fieldName);
}

function resolveUiOperationCode(
  field: ReportFieldDefinition,
  filterSelections: ReportUiFilterSelections,
  operationKey: string,
  multi: boolean,
): string {
  const picked = filterSelections[operationKey]?.[0];
  let code: string;
  if (picked?.value != null && picked.value !== '') {
    const raw = String(picked.value);
    const allowed = field.availableOperations?.some((o) => o.code === raw);
    code = allowed ? raw : pickOperator(field, multi);
  } else {
    code = pickOperator(field, multi);
  }
  return code;
}

/** Фильтры DATETIME: оператор из metadata, values — массив ISO-строк. */
function buildDateTimeFiltersWithOp(
  entityName: string,
  field: ReportFieldDefinition,
  selected: Values,
  operatorCode: string,
): ReportQueryFilter[] {
  const apiFieldName = resolveReportFilterFieldName(entityName, field.fieldName);
  const operator = operatorCode.trim();

  if (isReportFilterNullOperation(operator)) {
    return [{ fieldName: apiFieldName, operator }];
  }

  if (isReportDateTimeBetweenOperation(operator)) {
    const startIso = toReportDateTimeFilterIso(selected[0]?.value);
    const endIso = toReportDateTimeFilterIso(selected[1]?.value);
    if (!startIso || !endIso) {
      return [];
    }
    return [{ fieldName: apiFieldName, operator, values: [startIso, endIso] }];
  }

  const iso = toReportDateTimeFilterIso(selected[0]?.value);
  if (!iso) {
    return [];
  }

  return [{ fieldName: apiFieldName, operator, values: [iso] }];
}

function resolveFilterValues(
  field: ReportFieldDefinition | undefined,
  selected: Values,
): unknown[] {
  const raw = valuesToFilterValue(selected);
  const list = Array.isArray(raw) ? raw : [raw];
  const formatted = list
    .map((v) => formatFilterValueForField(field, v))
    .filter((v) => v != null && v !== '');
  return formatted;
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

/** Примитивные scalar-типы полей (не reference entity). */
function isScalarFieldType(type: string | undefined): boolean {
  if (!type) return false;
  const scalarTypes = new Set([
    'TEXT',
    'STRING',
    'VARCHAR',
    'CHAR',
    'NVARCHAR',
    'NCHAR',
    'CLOB',
    'INTEGER',
    'INT',
    'LONG',
    'BIGINT',
    'SHORT',
    'BYTE',
    'TINYINT',
    'DOUBLE',
    'FLOAT',
    'BIGDECIMAL',
    'DECIMAL',
    'NUMBER',
    'NUMERIC',
    'REAL',
    'BOOLEAN',
    'BOOL',
    'DATETIME',
    'DATE',
    'TIME',
    'TIMESTAMP',
    'INSTANT',
    'LOCALDATE',
    'LOCALDATETIME',
    'LOCALTIME',
    'ZONEDDATETIME',
    'OFFSETDATETIME',
    'ENUM',
    'JSON',
    'UUID',
    'GUID',
    'BLOB',
    'BINARY',
    'VARBINARY',
    'BYTEA',
    'IMAGE',
    'YEAR',
    'COORDINATE',
  ]);
  const upper = type.toUpperCase();
  return scalarTypes.has(upper) || upper.startsWith('VARCHAR') || upper.startsWith('NVARCHAR');
}

/** Значения выглядят как ID (числа или строки из цифр). */
function valuesLookLikeId(selected: Values): boolean {
  return selected.every((s) => typeof s.value === 'number' || /^\d+$/.test(String(s.value)));
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
      fieldName: resolveReportTableSelectedPayloadFieldName(
        path,
        context.entityMetadata.entityName,
      ),
    };
    const isAutoQualified = displayLabel.includes(QUALIFIED_LABEL_SEPARATOR);
    const isSafeAlias = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(displayLabel);
    if (!isAutoQualified && displayLabel !== defaultLabel && isSafeAlias) {
      payload.alias = displayLabel;
    }
    if (fnCode) {
      payload.aggregation = fnCode;
    }
    return payload;
  });
}

function mergeSelectedFields(
  payloads: ReportSelectedFieldPayload[][],
): ReportSelectedFieldPayload[] {
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

    let apiFieldName = resolveReportFilterFieldName(metadata.entityName, fieldName);

    const fieldDef = resolveFilterFieldDef(fieldName, field, fieldMap);

    // Для reference entity полей без явного .id и со scalar-ID значениями — добавляем .id
    if (fieldDef && !isScalarFieldType(fieldDef.type) && !apiFieldName.endsWith('.id')) {
      if (valuesLookLikeId(selected)) {
        apiFieldName = `${apiFieldName}.id`;
      }
    }

    if (fieldDef && isReportDateTimeField(fieldDef)) {
      const opCode = resolveUiOperationCode(fieldDef, row.filterSelections, operationKey, false);
      for (const dtFilter of buildDateTimeFiltersWithOp(
        metadata.entityName,
        fieldDef,
        selected,
        opCode,
      )) {
        filters.push(withFilterGroup(dtFilter, options.groupNumber));
      }
      return;
    }

    const opField = fieldDef ?? primary;
    const multi = selected.length > 1;
    const operator = resolveUiOperationCode(opField, row.filterSelections, operationKey, multi);
    const values = resolveFilterValues(fieldDef, selected);
    if (!values.length) {
      return;
    }
    filters.push(
      withFilterGroup(
        {
          fieldName: apiFieldName,
          operator,
          values,
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
        const attributeField =
          findReferenceEntityFieldByAttribute(
            tableFieldsContext.tableMetadataByRowId[row.id],
            nested.attribute,
          ) ?? primary;
        pushFilter(
          resolveNestedEntityFilterFieldName(primary, nested.attribute),
          nested.values,
          attributeField,
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
    let apiFieldName = resolveReportFilterFieldName(metadata.entityName, fieldName);

    // Для reference entity полей без явного .id и со scalar-ID значениями — добавляем .id
    if (field && !isScalarFieldType(field.type) && !apiFieldName.endsWith('.id')) {
      if (valuesLookLikeId(selected)) {
        apiFieldName = `${apiFieldName}.id`;
      }
    }

    const multi = selected.length > 1;
    const operator = pickOperator(field, multi);
    const values = resolveFilterValues(field, selected);
    if (!values.length) {
      return;
    }
    filters.push({
      fieldName: apiFieldName,
      operator,
      values,
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
  const {
    metadata,
    outputRows,
    logicOperator = 'or',
    reportTableFieldsMetadataByRowId = {},
  } = params;
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
    const single = buildReportQueryRequestForRow(
      metadata,
      activeRows[0],
      {
        includeGroupFilters: activeRows[0].id === primaryRow.id,
        groupNumber: reportFilterGroupNumberForRowIndex(0),
      },
      tableFieldsContext,
    );
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
