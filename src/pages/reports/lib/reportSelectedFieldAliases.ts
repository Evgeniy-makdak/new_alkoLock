import type { Values } from '@shared/ui/search_multiple_select';

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

/**
 * Подписи «Текущего состава» (value = fieldName/path, label = UI / карандаш)
 * → columnHeaderLabels для грида.
 */
export function buildReportColumnHeaderLabelsFromComposeFields(
  tableFields: Values,
): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const item of tableFields) {
    const path = String(item.value ?? '').trim();
    const label = String(item.label ?? '').trim();
    if (!path || !label) continue;
    labels[path] = label;
  }
  return labels;
}

export function resolveReportColumnHeaderLabel(
  columnKey: string,
  columnAliases: Map<string, string>,
  fallbackLabel: string,
): string {
  return columnAliases.get(columnKey) ?? fallbackLabel;
}
