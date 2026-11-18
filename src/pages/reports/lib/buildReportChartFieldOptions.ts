import type { ReportQueryRequest } from '../types/reportApiTypes';

export type ReportChartFieldOption = { value: string; label: string };

type ChartFieldsSource = {
  body?: Pick<ReportQueryRequest, 'selectedFields' | 'groupBy'> | null;
  columnHeaderLabels?: Record<string, string> | null;
};

/**
 * Поля отчёта для осей/серий графика (подписи как в таблице).
 */
export function buildReportChartFieldOptions(
  queryContext: ChartFieldsSource | null | undefined,
  content: Array<Record<string, unknown>> | null | undefined,
): ReportChartFieldOption[] {
  const labels = queryContext?.columnHeaderLabels ?? {};
  const keys = new Set<string>();
  for (const field of queryContext?.body?.selectedFields ?? []) {
    if (field?.fieldName) keys.add(field.fieldName);
  }
  for (const field of queryContext?.body?.groupBy ?? []) {
    if (field) keys.add(field);
  }
  for (const row of content ?? []) {
    Object.keys(row).forEach((key) => keys.add(key));
  }
  return Array.from(keys).map((value) => ({
    value,
    label: labels[value] || value,
  }));
}
