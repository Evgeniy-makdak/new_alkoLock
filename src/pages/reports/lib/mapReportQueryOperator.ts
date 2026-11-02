/** UI/POST: оператор «В диапазоне» (between) — всегда два значения (начало/конец). */
export function isReportDateTimeBetweenOperation(operationCode: string | null | undefined): boolean {
  return (operationCode ?? '').trim().toLowerCase() === 'between';
}

/** Алиас: between для любого типа поля в «Фильтрации» отчётов. */
export const isReportBetweenFilterOperation = isReportDateTimeBetweenOperation;

/** Оба слота between заполнены (value[0] и value[1]). */
export function isReportBetweenFilterValuesComplete(
  values: { value?: unknown }[] | null | undefined,
): boolean {
  const start = values?.[0]?.value;
  const end = values?.[1]?.value;
  return start != null && start !== '' && end != null && end !== '';
}

/** Операторы без values в filters[] (metadata: isNull, isNotNull). */
export function isReportFilterNullOperation(operationCode: string | null | undefined): boolean {
  const op = (operationCode ?? '').trim().toLowerCase();
  return op === 'isnull' || op === 'isnotnull';
}

/** Операторы сравнения / «после»/«до»: одно значение в поле «Значение» (без мультивыбора). */
export function isReportSingleValueFilterOperation(operationCode: string | null | undefined): boolean {
  const op = (operationCode ?? '').trim().toLowerCase();
  return (
    op === 'eq' ||
    op === 'ne' ||
    op === 'gt' ||
    op === 'gte' ||
    op === 'lt' ||
    op === 'lte' ||
    op === 'after' ||
    op === 'before'
  );
}

/** Лимит значений в «Значение»: 1 для сравнения; 2 для between; для enum без оператора — 1; иначе без лимита. */
export function resolveReportFilterValueMaxValues(
  filterOperationCode: string | null | undefined,
  defaultMultiple: boolean,
  isBooleanValueField = false,
): number | undefined {
  if (isBooleanValueField) return undefined;
  if (isReportSingleValueFilterOperation(filterOperationCode)) return 1;
  // between — ровно два значения (начало / конец), для любого типа поля.
  if (isReportBetweenFilterOperation(filterOperationCode)) return 2;
  if ((filterOperationCode ?? '').trim()) return undefined;
  if (!defaultMultiple) return 1;
  return undefined;
}
