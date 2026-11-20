/**
 * Строки выгрузки (PDF/CSV/XLS) в том же порядке, что таблица UI:
 * pageable.sort через /query (бэкенд /export sort игнорирует).
 */

import { executeReportQuery } from '../api/reportsApi';
import {
  formatReportExportDateCell,
  type ReportExportDateColumn,
  type ReportExportPlan,
} from './buildReportExportPlan';
import { filterReportContentRowsForUi } from './reportAnonymousUser';
import { REPORT_EMPTY_DISPLAY, finalizeReportCellDisplay, isReportEmptyValue } from './reportDisplayValue';

import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

const QUERY_PAGE_SIZE = 200;
const MAX_PAGES = 500;

function cellToDisplay(
  raw: unknown,
  precision: ReportExportDateColumn['precision'] | undefined,
): string {
  if (isReportEmptyValue(raw)) return REPORT_EMPTY_DISPLAY;
  const asString = typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean'
    ? String(raw)
    : raw instanceof Date
      ? raw.toISOString()
      : JSON.stringify(raw);
  // day: `YYYY-MM-DD`; minute/second: только полный ISO с `T` (см. formatReportExportDateCell).
  if (precision) {
    const trimmed = asString.trim();
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
    const isDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed);
    if ((precision === 'day' && isDateOnly) || isDateTime) {
      return formatReportExportDateCell(asString, precision);
    }
  }
  return finalizeReportCellDisplay(asString);
}

function pickRowValue(
  row: Record<string, unknown>,
  field: ReportSelectedFieldPayload,
): unknown {
  const alias = (field.alias ?? '').trim();
  const path = (field.fieldName ?? '').trim();
  if (alias && Object.prototype.hasOwnProperty.call(row, alias)) return row[alias];
  if (path && Object.prototype.hasOwnProperty.call(row, path)) return row[path];
  if (alias && row[alias] !== undefined) return row[alias];
  if (path && row[path] !== undefined) return row[path];
  return null;
}

function mapContentToRows(
  content: Record<string, unknown>[],
  fields: ReportSelectedFieldPayload[],
  dateColumns: ReportExportDateColumn[],
): string[][] {
  const precisionByIndex = new Map(dateColumns.map((col) => [col.index, col.precision]));
  return content.map((row) =>
    fields.map((field, index) =>
      cellToDisplay(pickRowValue(row, field), precisionByIndex.get(index)),
    ),
  );
}

/**
 * Все страницы /query с тем же sort, что у грида → строки выгрузки.
 */
export async function fetchSortedReportRowsForPdf(args: {
  entityName: string;
  plan: ReportExportPlan;
  sort: string[];
  branchIds?: number[];
}): Promise<string[][]> {
  const fields = args.plan.body.selectedFields ?? [];
  if (!fields.length) return [];

  const rows: string[][] = [];
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < MAX_PAGES && rows.length < total) {
    const result = await executeReportQuery(args.entityName, args.plan.body, {
      page,
      size: QUERY_PAGE_SIZE,
      sort: args.sort,
      branchIds: args.branchIds,
    });
    const rawContent = Array.isArray(result.content)
      ? (result.content as Record<string, unknown>[])
      : [];
    // Как таблица UI: без служебных anonymous-строк.
    const content = filterReportContentRowsForUi(rawContent);
    total = typeof result.totalElements === 'number' ? result.totalElements : rawContent.length;
    rows.push(...mapContentToRows(content, fields, args.plan.dateColumns));
    if (!rawContent.length || rawContent.length < QUERY_PAGE_SIZE) break;
    page += 1;
  }

  return rows;
}
