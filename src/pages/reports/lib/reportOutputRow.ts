import { findReferenceEntityFieldByAttribute } from './findReferenceEntityFieldByAttribute';
import {
  isReportBetweenFilterOperation,
  isReportBetweenFilterValuesComplete,
  isReportFilterNullOperation,
} from './mapReportQueryOperator';
import { resolveReportOutputPrimaryField } from './reportEntityCompositeFields';
import {
  isNestedFilterPathReadyForValueInput,
  normalizeNestedFilterPath,
  resolveNestedFilterLeafField,
} from './reportNestedFilterPath';
import { reportOutputOperationKey } from './reportOutputFilterKeys';

import type { TFunction } from 'i18next';

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

/** Первая строка: «Группа фильтров №1», общие фильтры сущности (тип события и т.д.). */
export function getPrimaryOutputRowFromList(rows: ReportOutputRow[]): ReportOutputRow {
  if (!rows.length) {
    return createDefaultReportOutputRow();
  }
  return rows[0];
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
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
  t?: TFunction,
): boolean {
  const primaryKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
  if (!primaryKey) return false;

  const primaryField = t
    ? resolveReportOutputPrimaryField(primaryKey, fieldMap, entityMetadata ?? null, t)
    : fieldMap.get(primaryKey);
  if (!primaryField) return false;

  const refEntity = primaryField.referenceEntity?.trim();
  const nestedState = row.nestedEntityFilterByField[primaryField.fieldName];

  const nestedPath = nestedState ? normalizeNestedFilterPath(nestedState) : [];
  const attributeField =
    refEntity && nestedPath.length
      ? resolveNestedFilterLeafField(
          tableFieldsMetadata,
          nestedPath,
          referenceEntityMetadataByName,
        )
      : undefined;
  const operationSource = attributeField ?? primaryField;

  const needsOperation = (operationSource.availableOperations ?? []).length > 0;
  const operationPicked = row.filterSelections[reportOutputOperationKey(row.id)] ?? [];
  const operationSelected = operationPicked.length > 0;
  const operationCode =
    operationPicked[0]?.value != null && operationPicked[0].value !== ''
      ? String(operationPicked[0].value)
      : null;
  // isNull / isNotNull — значение не требуется.
  const valueNotRequired =
    operationSelected && isReportFilterNullOperation(operationCode);
  // between — обязательно оба слота (начало и конец).
  const needsBetweenPair =
    operationSelected && isReportBetweenFilterOperation(operationCode);

  const nestedValues = nestedState?.values ?? [];
  const scalarValues = row.filterSelections[primaryField.fieldName] ?? [];
  const nestedValuesReady = needsBetweenPair
    ? isReportBetweenFilterValuesComplete(nestedValues)
    : nestedValues.length > 0;
  const scalarValuesReady = needsBetweenPair
    ? isReportBetweenFilterValuesComplete(scalarValues)
    : scalarValues.length > 0;

  const nestedTerminalReady = Boolean(
    refEntity &&
      isNestedFilterPathReadyForValueInput(
        tableFieldsMetadata,
        nestedPath,
        referenceEntityMetadataByName,
      ) &&
      (nestedValuesReady || valueNotRequired),
  );

  const scalarTerminalReady = Boolean(
    !refEntity &&
      primaryField.filterable &&
      (scalarValuesReady || valueNotRequired),
  );

  const outputControlsReady = Boolean(
    nestedTerminalReady || scalarTerminalReady || (!refEntity && !primaryField.filterable),
  );
  if (!outputControlsReady) return false;

  return !needsOperation || operationSelected;
}

/**
 * Фильтры модалки «Новый отчёт» готовы к формированию:
 * нет строк — ок; каждая добавленная строка должна быть заполнена полностью.
 */
export function areReportComposeFiltersComplete(
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableFieldsMetadataByRowId: Record<string, ReportEntityMetadata | null> = {},
  entityMetadata?: ReportEntityMetadata | null,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
  t?: TFunction,
): boolean {
  if (!outputRows.length) return true;
  return outputRows.every((row) =>
    isReportOutputRowComplete(
      row,
      fieldMap,
      tableFieldsMetadataByRowId[row.id] ?? null,
      entityMetadata,
      referenceEntityMetadataByName,
      t,
    ),
  );
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
