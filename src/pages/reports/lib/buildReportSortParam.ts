import type { GridSortModel } from '@mui/x-data-grid';

import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
  planReportCompositeResultColumns,
} from './reportEntityCompositeFields';
import {
  getDuplicateColumnIndex,
  stripDuplicateColumnSuffix,
} from './reportColumnDuplicate';
import {
  encodeReportFieldAliasForApi,
  extractReportTableFieldLabelLeaf,
} from './reportSelectedFieldAliases';
import { isReportSortApiFieldHidden } from './reportColumnVisibility';

import type { ReportComposeSortRow, ReportSortDirection } from '../types/reportComposeSort';
import { createReportComposeSortRow } from '../types/reportComposeSort';
import type {
  ReportGroupByField,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';
import { SortsTypes } from '@shared/config/queryParamsEnums';
import type { Values } from '@shared/ui/search_multiple_select';

type ReportGroupByInput = Array<string | ReportGroupByField> | undefined;

/** Устаревшие ключи грида → ключ колонки content (как в selectedFields / content). */
const REPORT_GRID_FIELD_TO_CONTENT_KEY: Record<string, string> = {
  __reportRowCreatedAt: 'timestamp',
  groupNames: 'groupMembership.group.name',
};

/**
 * Имя для query?sort=… — то же, что fieldName в selectedFields и ключ в content
 * (reportedAt, vehicle.model, …).
 */
export function resolveReportSortApiField(contentColumnKey: string): string {
  return contentColumnKey;
}

/**
 * Имя поля для pageable.sort.
 * Раньше при GROUP BY отдавали только поля groupBy — из‑за этого в гриде
 * не было стрелки на колонках состава с агрегацией. Compose допускает
 * сортировку по любому полю «Текущего состава» — здесь так же.
 */
export function resolveReportSortApiFieldForQuery(
  columnKey: string,
  _groupBy?: ReportGroupByInput,
): string | null {
  void _groupBy;
  return resolveComposeColumnApiField(columnKey);
}

export function isReportSortAllowedWithGroupBy(
  columnKey: string,
  groupBy: ReportGroupByInput,
): boolean {
  return resolveReportSortApiFieldForQuery(columnKey, groupBy) != null;
}

/** content-ключ колонки → имя для &sort= */
export function buildReportSortFieldMap(
  selectedFields: ReportSelectedFieldPayload[],
  groupBy?: ReportGroupByInput,
): Map<string, string> {
  const map = new Map<string, string>();
  const fieldNames: string[] = [];

  for (const field of selectedFields) {
    const fieldName = field.fieldName?.trim();
    if (!fieldName || isReportCompositeFieldPath(fieldName)) continue;
    fieldNames.push(fieldName);
    const sortField = resolveReportSortApiFieldForQuery(fieldName, groupBy);
    if (sortField) {
      map.set(fieldName, sortField);
      // content/колонка грида может быть с ключом = alias
      const alias = field.alias?.trim();
      if (alias) {
        map.set(alias, field.aggregation ? alias : sortField);
      }
    }
  }

  const { displayColumnKeys, groups } = planReportCompositeResultColumns(fieldNames, fieldNames);
  for (const group of groups) {
    const sortField = resolveReportSortApiFieldForQuery(group.compositeKey, groupBy);
    if (sortField) {
      map.set(group.compositeKey, sortField);
    }
  }
  for (const key of displayColumnKeys) {
    if (map.has(key)) continue;
    const sortField = resolveReportSortApiFieldForQuery(key, groupBy);
    if (sortField) {
      map.set(key, sortField);
    }
  }

  return map;
}

/**
 * sortModel → параметры pageable.sort (значение вида timestamp,ASC).
 */
export function buildReportSortParams(
  sortModel: GridSortModel,
  sortFieldByColumn: Map<string, string>,
  groupBy?: ReportGroupByInput,
): string[] {
  const item = sortModel[0];
  if (!item?.field || !item.sort) {
    return [];
  }

  const contentKey = REPORT_GRID_FIELD_TO_CONTENT_KEY[item.field] ?? item.field;
  const apiField =
    sortFieldByColumn.get(contentKey) ??
    resolveReportSortApiFieldForQuery(contentKey, groupBy);
  if (!apiField) return [];
  const direction = item.sort === SortsTypes.asc ? 'ASC' : 'DESC';
  return [`${apiField},${direction}`];
}

export function reportSortParamsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

/**
 * pageable.sort из модалки → GridSortModel, чтобы стрелки грида и sort-effect
 * не затирали выбранную в compose сортировку пустым sortModel.
 */
export function buildReportGridSortModelFromSortParams(
  sortParams: string[],
  selectedFields?: ReportSelectedFieldPayload[],
): GridSortModel {
  const param = (sortParams[0] ?? '').trim();
  if (!param) return [];

  const commaIndex = param.lastIndexOf(',');
  if (commaIndex <= 0) return [];

  const apiField = param.slice(0, commaIndex).trim();
  const directionRaw = param.slice(commaIndex + 1).trim().toUpperCase();
  if (!apiField || (directionRaw !== 'ASC' && directionRaw !== 'DESC')) return [];

  // fieldName надёжнее для pageable.sort; alias подставим, когда появятся колонки content.
  let gridField = apiField;
  if (selectedFields?.length) {
    const match = selectedFields.find((field) => (field.fieldName ?? '').trim() === apiField);
    if (match?.fieldName) {
      gridField = match.fieldName.trim();
    }
  }

  return [
    {
      field: gridField,
      sort: directionRaw === 'ASC' ? SortsTypes.asc : SortsTypes.desc,
    },
  ];
}

/** apiField из pageable.sort (`model,DESC` → `model`). */
export function getReportSortApiFieldFromParams(sortParams: string[]): string {
  const param = (sortParams[0] ?? '').trim();
  if (!param) return '';
  const commaIndex = param.lastIndexOf(',');
  return (commaIndex > 0 ? param.slice(0, commaIndex) : param).trim();
}

/**
 * Сортировка по колонке с закрытым «глазом»: в гриде колонки нет,
 * пустой sortModel не должен затирать pageable.sort (нужен для edit).
 */
export function isReportSortFieldHidden(
  sortParams: string[],
  hiddenColumnKeys: string[] | undefined,
  selectedFields?: ReportSelectedFieldPayload[],
): boolean {
  const apiField = getReportSortApiFieldFromParams(sortParams);
  if (!apiField) return false;
  return isReportSortApiFieldHidden(apiField, hiddenColumnKeys, selectedFields);
}

/** Подгоняет sortModel под фактические field колонок грида (fieldName ↔ alias). */
export function alignReportGridSortModelToColumnFields(
  sortModel: GridSortModel,
  columnFields: string[],
  selectedFields?: ReportSelectedFieldPayload[],
): GridSortModel {
  if (!sortModel.length || !columnFields.length) return sortModel;
  const fieldSet = new Set(columnFields.filter(Boolean));

  return sortModel.map((item) => {
    const field = (item.field ?? '').trim();
    if (!field || fieldSet.has(field)) return item;

    const byName = selectedFields?.find((f) => (f.fieldName ?? '').trim() === field);
    const alias = (byName?.alias ?? '').trim();
    if (alias && fieldSet.has(alias)) {
      return { ...item, field: alias };
    }

    const byAlias = selectedFields?.find((f) => (f.alias ?? '').trim() === field);
    const fieldName = (byAlias?.fieldName ?? '').trim();
    if (fieldName && fieldSet.has(fieldName)) {
      return { ...item, field: fieldName };
    }

    return item;
  });
}

/** UI-ключ колонки → fieldName для sort / groupBy в POST …/query. */
export function resolveComposeColumnApiField(columnKey: string): string | null {
  // Клоны «field#N» → базовый fieldPath (SQL видит реальное поле, без суффикса).
  const key = stripDuplicateColumnSuffix(String(columnKey ?? '').trim());
  if (!key || isReportCompositeFieldPath(key)) {
    const members = isReportCompositeFieldPath(key) ? expandCompositeFieldPath(key) : [];
    const firstMember = members.find((member) => !isReportCompositeFieldPath(member));
    return firstMember ? resolveReportSortApiField(firstMember) : null;
  }
  return resolveReportSortApiField(key);
}

/** Строки сортировки из формы «Новый отчёт» → параметры pageable.sort. */
export function buildComposeSortParams(
  rows: { columnKey: string; direction: 'ASC' | 'DESC' }[],
  groupBy?: ReportGroupByInput,
  selectedFields?: ReportSelectedFieldPayload[],
  columnFields?: Values,
): string[] {
  return rows
    .map((row) => {
      const baseField = resolveReportSortApiFieldForQuery(row.columnKey, groupBy);
      if (!baseField) return null;

      const column = columnFields?.find(
        (item) => String(item.value) === row.columnKey,
      );
      const labelLeaf = column ? extractReportTableFieldLabelLeaf(column.label) : '';
      const expectedAlias = labelLeaf ? encodeReportFieldAliasForApi(labelLeaf) : '';
      const duplicateIndex = getDuplicateColumnIndex(row.columnKey);
      const matchingFields = (selectedFields ?? []).filter(
        (field) => field.fieldName?.trim() === baseField,
      );
      const selectedField =
        matchingFields.find((field) => field.alias?.trim() === expectedAlias) ??
        matchingFields[duplicateIndex - 1] ??
        matchingFields[0];
      const apiField =
        selectedField?.aggregation && selectedField.alias?.trim()
          ? selectedField.alias.trim()
          : baseField;
      return `${apiField},${row.direction}`;
    })
    .filter((item): item is string => item != null);
}

function findComposeSortColumnKey(
  apiField: string,
  columnKeys: Values,
  selectedFields?: ReportSelectedFieldPayload[],
): string {
  const aliasField = selectedFields?.find((field) => field.alias?.trim() === apiField);
  if (aliasField?.aggregation) {
    const aliasIndex = (selectedFields ?? [])
      .filter((field) => field.fieldName === aliasField.fieldName)
      .indexOf(aliasField);
    const matchingColumns = columnKeys.filter(
      (item) =>
        resolveComposeColumnApiField(String(item.value)) === aliasField.fieldName,
    );
    const aliasColumn = matchingColumns.find(
      (item) =>
        encodeReportFieldAliasForApi(extractReportTableFieldLabelLeaf(item.label)) === apiField,
    );
    if (aliasColumn) return String(aliasColumn.value);
    if (matchingColumns[aliasIndex]) return String(matchingColumns[aliasIndex].value);
  }

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

/** pageable.sort → строки сортировки формы (для редактирования сформированного отчёта). */
export function parseComposeSortRowsFromSortParams(
  sortParams: string[],
  columnKeys: Values,
  selectedFields?: ReportSelectedFieldPayload[],
): ReportComposeSortRow[] {
  return sortParams
    .map((param) => {
      const commaIndex = param.lastIndexOf(',');
      if (commaIndex <= 0) return null;

      const apiField = param.slice(0, commaIndex);
      const directionRaw = param.slice(commaIndex + 1).toUpperCase();
      if (directionRaw !== 'ASC' && directionRaw !== 'DESC') return null;

      return createReportComposeSortRow(
        findComposeSortColumnKey(apiField, columnKeys, selectedFields),
        directionRaw as ReportSortDirection,
      );
    })
    .filter((row): row is ReportComposeSortRow => row != null);
}

/** URL query value for pageable.sort; preserve Spring's comma direction separator. */
export function encodeReportSortParamForQuery(sortParam: string): string {
  const separatorIndex = sortParam.lastIndexOf(',');
  if (separatorIndex < 0) return encodeURIComponent(sortParam);
  return `${encodeURIComponent(sortParam.slice(0, separatorIndex))},${encodeURIComponent(
    sortParam.slice(separatorIndex + 1),
  )}`;
}
