import type { GridSortModel } from '@mui/x-data-grid';

import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
  planReportCompositeResultColumns,
} from './reportEntityCompositeFields';

import type { ReportComposeSortRow, ReportSortDirection } from '../types/reportComposeSort';
import { createReportComposeSortRow } from '../types/reportComposeSort';
import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';
import { SortsTypes } from '@shared/config/queryParamsEnums';
import type { Values } from '@shared/ui/search_multiple_select';

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

function resolveGroupApiFieldsForColumnKey(columnKey: string): string[] {
  const key = columnKey.trim();
  if (!key) return [];
  if (isReportCompositeFieldPath(key)) {
    return expandCompositeFieldPath(key).filter(Boolean);
  }
  return [key];
}

/**
 * При активном GROUP BY ORDER BY допустим только по полям из groupBy
 * (иначе PostgreSQL: column must appear in GROUP BY).
 */
export function resolveReportSortApiFieldForQuery(
  columnKey: string,
  groupBy?: string[],
): string | null {
  const apiField = resolveComposeColumnApiField(columnKey);
  if (!apiField) return null;
  if (!groupBy?.length) return apiField;

  const groupSet = new Set(groupBy);
  if (groupSet.has(apiField)) return apiField;

  if (isReportCompositeFieldPath(columnKey)) {
    const members = resolveGroupApiFieldsForColumnKey(columnKey);
    if (members.length > 1 && members.every((member) => groupSet.has(member))) {
      return apiField;
    }
  }

  return null;
}

export function isReportSortAllowedWithGroupBy(
  columnKey: string,
  groupBy: string[] | undefined,
): boolean {
  return resolveReportSortApiFieldForQuery(columnKey, groupBy) != null;
}

/** content-ключ колонки → имя для &sort= */
export function buildReportSortFieldMap(
  selectedFields: ReportSelectedFieldPayload[],
  groupBy?: string[],
): Map<string, string> {
  const map = new Map<string, string>();
  const fieldNames: string[] = [];

  for (const { fieldName } of selectedFields) {
    if (!fieldName || isReportCompositeFieldPath(fieldName)) continue;
    fieldNames.push(fieldName);
    const sortField = resolveReportSortApiFieldForQuery(fieldName, groupBy);
    if (sortField) {
      map.set(fieldName, sortField);
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
  groupBy?: string[],
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

/** UI-ключ колонки → fieldName для sort / groupBy в POST …/query. */
export function resolveComposeColumnApiField(columnKey: string): string | null {
  const key = columnKey.trim();
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
  groupBy?: string[],
): string[] {
  return rows
    .map((row) => {
      const apiField = resolveReportSortApiFieldForQuery(row.columnKey, groupBy);
      if (!apiField) return null;
      return `${apiField},${row.direction}`;
    })
    .filter((item): item is string => item != null);
}

function findComposeSortColumnKey(apiField: string, columnKeys: Values): string {
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
): ReportComposeSortRow[] {
  return sortParams
    .map((param) => {
      const commaIndex = param.lastIndexOf(',');
      if (commaIndex <= 0) return null;

      const apiField = param.slice(0, commaIndex);
      const directionRaw = param.slice(commaIndex + 1).toUpperCase();
      if (directionRaw !== 'ASC' && directionRaw !== 'DESC') return null;

      return createReportComposeSortRow(
        findComposeSortColumnKey(apiField, columnKeys),
        directionRaw as ReportSortDirection,
      );
    })
    .filter((row): row is ReportComposeSortRow => row != null);
}
