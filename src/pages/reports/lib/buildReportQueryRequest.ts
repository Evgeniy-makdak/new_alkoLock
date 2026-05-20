import type { Values } from '@shared/ui/search_multiple_select';

import {
  buildDateTimeBetweenRange,
  formatFilterValueForField,
  toReportDateTimeFilterIso,
} from './formatReportDateTimeFilterValue';
import { isReportDateTimeField } from './reportFieldFilterKind';
import {
  REPORT_OUTPUT_FUNCTION_KEY,
  REPORT_OUTPUT_OPERATION_KEY,
} from './reportOutputFilterKeys';

import { resolveNestedEntityFilterFieldName } from './resolveNestedEntityFilterFieldName';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportFieldOperation,
  ReportNestedEntityFilterByField,
  ReportQueryFilter,
  ReportQueryRequest,
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
  multi: boolean,
): string {
  const picked = filterSelections[REPORT_OUTPUT_OPERATION_KEY]?.[0];
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

const DEVICE_EVENT_TIME_FIELD_CANDIDATES = ['createdAt', 'timestamp'];

function findScalarMetadataField(
  metadata: ReportEntityMetadata,
  fieldNames: string[],
): ReportFieldDefinition | undefined {
  for (const name of fieldNames) {
    const field = metadata.fields.find((f) => f.fieldName === name);
    if (field && !field.referenceEntity?.trim()) {
      return field;
    }
  }
  return undefined;
}

/** Для отчёта по событиям всегда запрашиваем дату события (не только вложенное поле результата). */
function buildReportSelectedFields(
  metadata: ReportEntityMetadata,
  primary: ReportFieldDefinition,
  filterSelections: ReportUiFilterSelections,
): ReportSelectedFieldPayload[] {
  const payloads: ReportSelectedFieldPayload[] = [];
  const added = new Set<string>();

  const pushField = (field: ReportFieldDefinition) => {
    if (added.has(field.fieldName)) return;
    added.add(field.fieldName);
    payloads.push(toSelectedFieldPayload(field, filterSelections));
  };

  if (metadata.entityName === 'DeviceEvent') {
    const timeField = findScalarMetadataField(metadata, DEVICE_EVENT_TIME_FIELD_CANDIDATES);
    if (timeField) pushField(timeField);
  }

  pushField(primary);
  return payloads;
}

function toSelectedFieldPayload(
  field: ReportFieldDefinition,
  filterSelections: ReportUiFilterSelections,
): ReportSelectedFieldPayload {
  const payload: ReportSelectedFieldPayload = { fieldName: field.fieldName };
  if (field.alias) {
    payload.alias = field.alias;
  }
  const fnPick = filterSelections[REPORT_OUTPUT_FUNCTION_KEY]?.[0];
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

export function buildReportQueryRequest(params: {
  metadata: ReportEntityMetadata;
  selectedFieldKeys: Values;
  filterSelections: ReportUiFilterSelections;
  nestedEntityFilterByField?: ReportNestedEntityFilterByField;
}): ReportQueryRequest {
  const { metadata, selectedFieldKeys, filterSelections, nestedEntityFilterByField = {} } = params;
  const fieldMap = new Map(metadata.fields.map((f) => [f.fieldName, f]));

  const primaryKey = selectedFieldKeys[0] ? String(selectedFieldKeys[0].value) : '';
  const primary = primaryKey ? fieldMap.get(primaryKey) : undefined;

  if (!primary) {
    return { selectedFields: [], filters: [] };
  }

  const selectedFields = buildReportSelectedFields(metadata, primary, filterSelections);

  const filters: ReportQueryFilter[] = [];

  const pushFilter = (fieldName: string, selected: Values, field?: ReportFieldDefinition) => {
    if (!selected.length) return;

    if (field && isReportDateTimeField(field)) {
      const multi = selected.length > 1;
      const opCode = resolveUiOperationCode(field, filterSelections, multi);
      const dtFilter = buildDateTimeFilterWithOp(field, selected, opCode);
      if (dtFilter) {
        filters.push(dtFilter);
      }
      return;
    }

    const multi = selected.length > 1;
    const operator = resolveUiOperationCode(field ?? primary, filterSelections, multi);
    filters.push({
      fieldName,
      operator,
      value: resolveFilterValue(field, selected),
    });
  };

  if (primary.filterable) {
    const ref = primary.referenceEntity?.trim();
    if (ref) {
      const nested = nestedEntityFilterByField[primary.fieldName];
      if (nested?.attribute && nested.values.length) {
        pushFilter(
          resolveNestedEntityFilterFieldName(primary, nested.attribute),
          nested.values,
          primary,
        );
      }
    } else {
      const selected = filterSelections[primary.fieldName] ?? [];
      if (selected.length) {
        pushFilter(primary.fieldName, selected, primary);
      }
    }
  }

  for (const [controlId, selected] of Object.entries(filterSelections)) {
    if (!selected?.length) continue;
    if (controlId === primary.fieldName) continue;
    if (controlId === REPORT_OUTPUT_OPERATION_KEY || controlId === REPORT_OUTPUT_FUNCTION_KEY) continue;

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

  return {
    selectedFields,
    filters,
  };
}
