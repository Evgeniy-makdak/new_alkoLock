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

import type { ReportQueryRequest, ReportSelectedFieldPayload } from '../types/reportApiTypes';

const DEFAULT_QUERY_PAGE_SIZE = 200;
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

/**
 * Значение колонки из content. При наличии alias (клон Дата_1 / Дата_1_2)
 * НЕ падаем на fieldName — клоны делят path и иначе получают чужую ячейку.
 */
export function pickReportExportRowValue(
  row: Record<string, unknown>,
  field: ReportSelectedFieldPayload,
): unknown {
  const alias = (field.alias ?? '').trim();
  const path = (field.fieldName ?? '').trim();
  if (alias) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) return row[alias];
    if (row[alias] !== undefined) return row[alias];
    return null;
  }
  if (path && Object.prototype.hasOwnProperty.call(row, path)) return row[path];
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
      cellToDisplay(pickReportExportRowValue(row, field), precisionByIndex.get(index)),
    ),
  );
}

export type ReportExportSeedPage = {
  /** Номер страницы как у /query (`lastResult.number`). */
  pageNumber: number;
  /** Уже отфильтрованный content (как в lastResult после completeSuccess). */
  content: Record<string, unknown>[];
  /** size ответа — seed только если совпадает с pageSize выгрузки. */
  pageSize: number;
  totalElements: number;
  /** lastResult.last — не останавливаться по длине отфильтрованного content. */
  isLast: boolean;
};

/**
 * Все страницы /query с тем же sort/body/pageSize, что у грида → строки выгрузки.
 * valueFields — только проекция видимых колонок в файл; тело /query не подменяем
 * (иначе ties по sort-колонке перетасовывают целые строки относительно UI).
 */
export async function fetchSortedReportRowsForPdf(args: {
  entityName: string;
  plan: ReportExportPlan;
  sort: string[];
  branchIds?: number[];
  /** Тело как у сформированного отчёта (исходные alias) — без подмены selectedFields. */
  queryBody?: ReportQueryRequest;
  /** Как у грида (`pagination.pageSize`), иначе ties ≠ UI при size=200. */
  pageSize?: number;
  /** Страница, уже показанная в UI — без повторного /query. */
  seedPage?: ReportExportSeedPage | null;
}): Promise<string[][]> {
  const mappingFields =
    args.plan.valueFields?.length > 0
      ? args.plan.valueFields
      : (args.plan.body.selectedFields ?? []);
  if (!mappingFields.length) return [];

  // Как грид: полное body (в т.ч. скрытые в selectedFields). valueFields — только map.
  const queryBody: ReportQueryRequest = args.queryBody
    ? args.queryBody
    : { ...args.plan.body, selectedFields: mappingFields };

  const pageSize =
    typeof args.pageSize === 'number' && args.pageSize > 0
      ? args.pageSize
      : DEFAULT_QUERY_PAGE_SIZE;

  const seed =
    args.seedPage &&
    typeof args.seedPage.pageNumber === 'number' &&
    args.seedPage.pageSize === pageSize &&
    Array.isArray(args.seedPage.content)
      ? args.seedPage
      : null;

  const rows: string[][] = [];
  let page = 0;
  let total = Number.POSITIVE_INFINITY;

  while (page < MAX_PAGES && rows.length < total) {
    if (seed && seed.pageNumber === page) {
      // Тот же content, что на экране — порядок ties как в UI.
      total =
        typeof seed.totalElements === 'number' && seed.totalElements >= 0
          ? seed.totalElements
          : seed.content.length;
      rows.push(...mapContentToRows(seed.content, mappingFields, args.plan.dateColumns));
      if (seed.isLast) break;
      page += 1;
      continue;
    }

    const result = await executeReportQuery(args.entityName, queryBody, {
      page,
      size: pageSize,
      sort: args.sort,
      branchIds: args.branchIds,
    });
    const rawContent = Array.isArray(result.content)
      ? (result.content as Record<string, unknown>[])
      : [];
    // Как таблица UI: без служебных anonymous-строк.
    const content = filterReportContentRowsForUi(rawContent);
    total = typeof result.totalElements === 'number' ? result.totalElements : rawContent.length;
    rows.push(...mapContentToRows(content, mappingFields, args.plan.dateColumns));
    if (!rawContent.length || rawContent.length < pageSize) break;
    page += 1;
  }

  return rows;
}
