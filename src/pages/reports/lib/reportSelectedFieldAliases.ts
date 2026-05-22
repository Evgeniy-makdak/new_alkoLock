import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

/** Заголовки колонок таблицы по alias из POST selectedFields. */
export function buildReportColumnAliasMap(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of selectedFields ?? []) {
    const alias = field.alias?.trim();
    if (alias) {
      map.set(field.fieldName, alias);
    }
  }
  return map;
}

export function resolveReportColumnHeaderLabel(
  columnKey: string,
  columnAliases: Map<string, string>,
  fallbackLabel: string,
): string {
  return columnAliases.get(columnKey) ?? fallbackLabel;
}
