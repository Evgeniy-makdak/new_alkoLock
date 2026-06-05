import type { GridSortModel } from '@mui/x-data-grid';

import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
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

/** content-ключ колонки → имя для &sort= */
export function buildReportSortFieldMap(
  selectedFields: ReportSelectedFieldPayload[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const { fieldName } of selectedFields) {
    if (fieldName) {
      map.set(fieldName, resolveReportSortApiField(fieldName));
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
): string[] {
  const item = sortModel[0];
  if (!item?.field || !item.sort) {
    return [];
  }

  const contentKey = REPORT_GRID_FIELD_TO_CONTENT_KEY[item.field] ?? item.field;
  const apiField =
    sortFieldByColumn.get(contentKey) ?? resolveReportSortApiField(contentKey);
  const direction = item.sort === SortsTypes.asc ? 'ASC' : 'DESC';
  return [`${apiField},${direction}`];
}

export function reportSortParamsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function resolveComposeSortApiField(columnKey: string): string | null {
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
): string[] {
  return rows
    .map((row) => {
      const apiField = resolveComposeSortApiField(row.columnKey);
      if (!apiField) return null;
      return `${apiField},${row.direction}`;
    })
    .filter((item): item is string => item != null);
}

function findComposeSortColumnKey(apiField: string, columnKeys: Values): string {
  for (const item of columnKeys) {
    const key = String(item.value);
    if (resolveComposeSortApiField(key) === apiField) {
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
