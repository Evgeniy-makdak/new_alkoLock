/** Путь поля — идентификатор (id или *.id). */
export function isReportIdentifierFieldPath(fieldPath: string): boolean {
  const key = String(fieldPath ?? '').trim();
  if (!key) return false;
  const leaf = key.includes('.') ? key.slice(key.lastIndexOf('.') + 1) : key;
  return leaf === 'id';
}

/** Идентификатор корневой сущности отчёта (поле `id`). */
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

/**
 * Порядок «Текущего состава»: корневой id → прочие *.id → остальные поля.
 * Относительный порядок внутри каждой группы сохраняется.
 */
export function orderReportCompositionFieldsByIdentifier<T extends { value?: unknown }>(
  items: T[],
): T[] {
  const rootIds: T[] = [];
  const nestedIds: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const key = String(item.value ?? '').trim();
    if (isRootReportIdentifierFieldPath(key)) rootIds.push(item);
    else if (isReportIdentifierFieldPath(key)) nestedIds.push(item);
    else rest.push(item);
  }
  return [...rootIds, ...nestedIds, ...rest];
}
