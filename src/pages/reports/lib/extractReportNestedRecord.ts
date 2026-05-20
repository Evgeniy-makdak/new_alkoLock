/** Данные вложенной сущности из строки отчёта (например `device`, `vehicle`). */
export function extractReportNestedRecord(
  row: Record<string, unknown>,
  nestedFieldName: string,
): Record<string, unknown> {
  const nested = row[nestedFieldName];
  if (nested != null && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return row;
}
