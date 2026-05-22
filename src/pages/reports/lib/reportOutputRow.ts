import { reportOutputOperationKey } from './reportOutputFilterKeys';

import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportNestedEntityFilterByField,
  ReportOutputRow,
  ReportUiFilterSelections,
} from '../types/reportApiTypes';

export function hasReportTableFields(row: ReportOutputRow): boolean {
  return row.reportTableFields.length > 0;
}

export const PRIMARY_REPORT_OUTPUT_ROW_ID = 'primary';

export function createDefaultReportOutputRow(
  id: string = PRIMARY_REPORT_OUTPUT_ROW_ID,
): ReportOutputRow {
  return {
    id,
    selectedOutputFields: [],
    reportTableFields: [],
    filterSelections: {},
    nestedEntityFilterByField: {},
  };
}

export function createAdditionalReportOutputRow(): ReportOutputRow {
  return createDefaultReportOutputRow(`report-row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
}

export function isGroupFilterControlId(controlId: string): boolean {
  return controlId.startsWith('__group_');
}

/** Нижняя строка в UI: сущность, «+», общие фильтры сущности (тип события и т.д.). */
export function getPrimaryOutputRowFromList(rows: ReportOutputRow[]): ReportOutputRow {
  if (!rows.length) {
    return createDefaultReportOutputRow();
  }
  return rows[rows.length - 1];
}

export function getAdditionalOutputRows(rows: ReportOutputRow[]): ReportOutputRow[] {
  const primary = getPrimaryOutputRowFromList(rows);
  return rows.filter((row) => row.id !== primary.id);
}

/** Строка варианта заполнена: поле результата, терминальный фильтр и операция (если требуется). */
export function isReportOutputRowComplete(
  row: ReportOutputRow,
  fieldMap: Map<string, ReportFieldDefinition>,
  tableFieldsMetadata?: ReportEntityMetadata | null,
  entityMetadata?: ReportEntityMetadata | null,
): boolean {
  const primaryKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
  if (!primaryKey) return false;

  const primaryField = fieldMap.get(primaryKey);
  if (!primaryField) return false;

  const refEntity = primaryField.referenceEntity?.trim();
  const nestedState = row.nestedEntityFilterByField[primaryField.fieldName];

  const nestedTerminalReady = Boolean(
    refEntity && nestedState?.attribute && (nestedState.values?.length ?? 0) > 0,
  );

  const scalarTerminalReady = Boolean(
    !refEntity &&
      primaryField.filterable &&
      (row.filterSelections[primaryField.fieldName]?.length ?? 0) > 0,
  );

  const outputControlsReady = Boolean(
    nestedTerminalReady || scalarTerminalReady || (!refEntity && !primaryField.filterable),
  );
  if (!outputControlsReady) return false;

  const needsOperation = (primaryField.availableOperations ?? []).length > 0;
  const operationSelected =
    (row.filterSelections[reportOutputOperationKey(row.id)] ?? []).length > 0;

  return !needsOperation || operationSelected;
}

export function pickSharedGroupFilterSelections(
  filterSelections: ReportUiFilterSelections,
): ReportUiFilterSelections {
  const shared: ReportUiFilterSelections = {};
  for (const [key, value] of Object.entries(filterSelections)) {
    if (isGroupFilterControlId(key)) {
      shared[key] = value;
    }
  }
  return shared;
}
