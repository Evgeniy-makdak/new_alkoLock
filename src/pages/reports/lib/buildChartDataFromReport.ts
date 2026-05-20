import type { ReportFieldDefinition } from '../types/reportApiTypes';

export type ReportChartRow = { name: string; value: number };

export function buildChartDataFromReport(
  content: Record<string, unknown>[],
  selectedFields: ReportFieldDefinition[],
  maxCategories = 12,
): { rows: ReportChartRow[]; dimensionLabel: string } | null {
  if (!content.length) return null;

  const dimensionField =
    selectedFields.find((f) => f.groupable || f.filterable) ?? selectedFields[0];
  const key = dimensionField?.alias || dimensionField?.fieldName || Object.keys(content[0] ?? {})[0];
  if (!key) return null;

  const counts = new Map<string, number>();
  for (const row of content) {
    const raw = row[key];
    const name =
      raw == null || raw === ''
        ? '—'
        : typeof raw === 'object'
          ? JSON.stringify(raw)
          : String(raw);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, maxCategories);
  const rest = sorted.slice(maxCategories);
  const rows: ReportChartRow[] = top.map(([name, value]) => ({ name, value }));
  if (rest.length > 0) {
    rows.push({ name: '__other__', value: rest.reduce((s, [, v]) => s + v, 0) });
  }

  return {
    rows,
    dimensionLabel: dimensionField?.label || key,
  };
}
