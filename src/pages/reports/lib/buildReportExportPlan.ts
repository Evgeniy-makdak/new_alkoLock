import { buildDuplicateColumnKey } from './reportColumnDuplicate';
import {
  expandCompositeSelectedFields,
  isReportCompositeFieldPath,
} from './reportEntityCompositeFields';
import { finalizeReportQueryBodyForGroupBy } from './buildReportGroupParam';
import { decodeReportFieldAliasForUi } from './reportSelectedFieldAliases';
import {
  formatReportTableDateTime,
  resolveReportDateTimePrecision,
  type ReportDateTimePrecision,
} from './formatReportTableDateTime';

import type { ReportQueryRequest, ReportSelectedFieldPayload } from '../types/reportApiTypes';

export type ReportExportDateColumn = {
  index: number;
  fieldPath: string;
  precision: ReportDateTimePrecision;
};

/**
 * План выгрузки: тело для бэка + подписи/даты как в гриде на экране.
 * Alias в POST: только буквы/цифры/`_` (бэк не принимает пробелы/`->`);
 * displayHeaders — подписи как в UI (пробелы, ` -> `) для CSV/XLS/PDF polish.
 */
export type ReportExportPlan = {
  body: ReportQueryRequest;
  displayHeaders: string[];
  dateColumns: ReportExportDateColumn[];
};

/** Маркер стрелки « -> » внутри API-alias (бэк принимает только `_`). */
export const REPORT_EXPORT_ALIAS_ARROW_MARKER = '__';

/**
 * UI-заголовок → alias для export POST.
 * «Отчет по алкозамкам -> Наименование» → «Отчет_по_алкозамкам__Наименование».
 */
export function encodeDisplayHeaderAsExportAlias(header: string): string {
  let encoded = header.trim();
  encoded = encoded.replace(/\s*->\s*/g, REPORT_EXPORT_ALIAS_ARROW_MARKER);
  encoded = encoded.replace(/\s*·\s*/g, REPORT_EXPORT_ALIAS_ARROW_MARKER);
  encoded = encoded.replace(/\s+/g, '_');
  encoded = encoded.replace(/[^0-9A-Za-zА-Яа-яЁё_]/g, '');
  if (!encoded) return 'Col';
  if (!/^[A-Za-zА-Яа-яЁё]/.test(encoded)) {
    encoded = `C_${encoded}`;
  }
  return encoded;
}

function resolveDisplayHeader(
  field: ReportSelectedFieldPayload,
  occurrence: number,
  columnHeaderLabels: Record<string, string> | undefined,
): string {
  const path = (field.fieldName ?? '').trim();
  const alias = (field.alias ?? '').trim();
  const labels = columnHeaderLabels ?? {};
  const dupKey = occurrence > 1 ? buildDuplicateColumnKey(path, occurrence) : path;

  const fromLabels =
    (dupKey && (labels[dupKey] ?? '').trim()) ||
    (alias && (labels[alias] ?? '').trim()) ||
    (path && (labels[path] ?? '').trim());
  if (fromLabels) return fromLabels;

  if (alias) return decodeReportFieldAliasForUi(alias);
  return path;
}

function isSelectedFieldHidden(
  field: ReportSelectedFieldPayload,
  occurrence: number,
  hiddenColumnKeys: string[] | undefined,
): boolean {
  if (!hiddenColumnKeys?.length) return false;
  const hidden = new Set(hiddenColumnKeys.map((key) => String(key).trim()).filter(Boolean));
  if (!hidden.size) return false;
  const path = (field.fieldName ?? '').trim();
  const alias = (field.alias ?? '').trim();
  const dupKey = path && occurrence > 1 ? buildDuplicateColumnKey(path, occurrence) : path;
  if (dupKey && hidden.has(dupKey)) return true;
  if (path && hidden.has(path)) return true;
  if (alias && hidden.has(alias)) return true;
  return false;
}

/** ISO date/time из выгрузки бэка → формат как в ячейке грида. */
export function formatReportExportDateCell(
  raw: string,
  precision: ReportDateTimePrecision,
): string {
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(trimmed)) {
    return raw;
  }
  return formatReportTableDateTime(trimmed, precision);
}

/**
 * Собирает тело export + метаданные для выравнивания файла с таблицей на экране.
 */
export function buildReportExportPlan(
  body: ReportQueryRequest,
  options: {
    columnHeaderLabels?: Record<string, string>;
    hiddenColumnKeys?: string[];
  } = {},
): ReportExportPlan {
  const expanded = expandCompositeSelectedFields(body.selectedFields ?? []).filter(
    (field) => field.fieldName && !isReportCompositeFieldPath(field.fieldName),
  );

  const visibleFields: ReportSelectedFieldPayload[] = [];
  const displayHeaders: string[] = [];
  const dateColumns: ReportExportDateColumn[] = [];
  const occurrenceByPath = new Map<string, number>();
  const usedExportAliases = new Set<string>();

  for (const field of expanded) {
    const path = (field.fieldName ?? '').trim();
    const occurrence = path ? (occurrenceByPath.get(path) ?? 0) + 1 : 1;
    if (path) occurrenceByPath.set(path, occurrence);

    if (isSelectedFieldHidden(field, occurrence, options.hiddenColumnKeys)) continue;

    const header = resolveDisplayHeader(field, occurrence, options.columnHeaderLabels);
    displayHeaders.push(header);

    // В тело export — RU alias (с `_`/`__`), чтобы PDF/CSV с бэка не отдавали name/serialNumber.
    let exportAlias = encodeDisplayHeaderAsExportAlias(header);
    let suffix = 2;
    while (usedExportAliases.has(exportAlias.toLowerCase())) {
      exportAlias = `${encodeDisplayHeaderAsExportAlias(header)}_${suffix}`;
      suffix += 1;
    }
    usedExportAliases.add(exportAlias.toLowerCase());

    visibleFields.push({
      ...field,
      alias: exportAlias,
    });

    const colIndex = visibleFields.length - 1;
    dateColumns.push({
      index: colIndex,
      fieldPath: path,
      precision: resolveReportDateTimePrecision(path),
    });
  }

  // dateColumns только для полей, где значение реально дата/время (эвристика пути).
  // Оставляем все — formatReportExportDateCell не трогает не-ISO строки.
  const exportBody = finalizeReportQueryBodyForGroupBy({
    ...body,
    selectedFields: visibleFields,
  });

  return {
    body: exportBody,
    displayHeaders,
    dateColumns,
  };
}
