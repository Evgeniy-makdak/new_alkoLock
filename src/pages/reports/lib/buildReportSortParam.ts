import type { GridSortModel } from '@mui/x-data-grid';

import { SortsTypes } from '@shared/config/queryParamsEnums';

import type { ReportResultColumnMeta } from './reportResultTableColumns';

export const DEFAULT_REPORT_SORT = 'timestamp,DESC';

/** Поле грида → имя поля в query?sort=… */
const REPORT_GRID_SORT_FIELD_OVERRIDES: Record<string, string> = {
  __reportRowCreatedAt: 'timestamp',
  groupNames: 'groupMembership.group.name',
};

export function buildReportSortParams(
  sortModel: GridSortModel,
  nestedFieldName: string | null,
): string[] {
  const item = sortModel[0];
  if (!item?.field || !item.sort) {
    return [DEFAULT_REPORT_SORT];
  }

  let apiField = REPORT_GRID_SORT_FIELD_OVERRIDES[item.field] ?? item.field;
  if (!REPORT_GRID_SORT_FIELD_OVERRIDES[item.field] && nestedFieldName && !item.field.startsWith('__')) {
    apiField = `${nestedFieldName}.${item.field}`;
  }

  const direction = item.sort === SortsTypes.asc ? 'ASC' : 'DESC';
  return [`${apiField},${direction}`];
}

export function getDefaultReportSortModel(
  columnMeta: ReportResultColumnMeta[] | null | undefined,
): GridSortModel {
  if (columnMeta?.some((c) => c.field === '__reportRowCreatedAt')) {
    return [{ field: '__reportRowCreatedAt', sort: SortsTypes.desc }];
  }
  const timeCol = columnMeta?.find(
    (c) => c.field === 'timestamp' || c.field === 'createdAt',
  );
  if (timeCol) {
    return [{ field: timeCol.field, sort: SortsTypes.desc }];
  }
  return [{ field: 'timestamp', sort: SortsTypes.desc }];
}

export function reportSortParamsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}
