/** Путь поля — идентификатор (id или *.id). */
export function isReportIdentifierFieldPath(fieldPath: string): boolean {
  const key = String(fieldPath ?? '').trim();
  if (!key) return false;
  const leaf = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
  return leaf === 'id';
}

/** Идентификатор корневой сущности отчёта (всегда в «Текущем составе»). */
export function isRootReportIdentifierFieldPath(fieldPath: string): boolean {
  return String(fieldPath ?? '').trim() === 'id';
}

function normalizeAggregationCode(code: string): string {
  return code.toLowerCase().replace(/[_-]/g, '');
}

/** Для любого Идентификатора в «Текущем составе» — только count («Количество»). */
export function isReportIdentifierAggregationCode(code: string): boolean {
  return normalizeAggregationCode(code) === 'count';
}

/** Код агрегации по умолчанию для Идентификатора. */
export const REPORT_IDENTIFIER_AGGREGATION_CODE = 'count';
