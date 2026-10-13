import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

/**
 * «Текущий состав» при редактировании сформированного отчёта —
 * из body.selectedFields, подписи из columnHeaderLabels / optionLabels.
 */
export function restoreReportComposeTableFieldsFromQuery(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
  columnHeaderLabels: Record<string, string> | undefined = {},
  optionLabelByPath: Record<string, string> = {},
): Values {
  const result: Values = [];
  const seen = new Set<string>();

  for (const field of selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    const label =
      (field.alias ?? '').trim() ||
      (columnHeaderLabels[path] ?? '').trim() ||
      (optionLabelByPath[path] ?? '').trim() ||
      path;
    result.push({ value: path, label });
  }

  return result;
}

/** Подпись колонки для UI группировки/сортировки, если нет в options. */
export function resolveComposeColumnDisplayLabel(
  columnKey: string,
  columnOptions: Values,
  columnHeaderLabels: Record<string, string> | undefined = {},
): string {
  const key = columnKey.trim();
  if (!key) return '';
  const fromOptions = columnOptions.find((o) => String(o.value) === key);
  if (fromOptions?.label != null && String(fromOptions.label).trim()) {
    return String(fromOptions.label).trim();
  }
  const fromHeaders = (columnHeaderLabels[key] ?? '').trim();
  if (fromHeaders) return fromHeaders;
  return key;
}
