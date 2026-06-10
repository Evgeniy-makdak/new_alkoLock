/** UI/POST: оператор «В диапазоне» из metadata.availableOperations. */
export function isReportDateTimeBetweenOperation(operationCode: string | null | undefined): boolean {
  return (operationCode ?? '').trim().toLowerCase() === 'between';
}

/** Операторы без values в filters[] (metadata: isNull, isNotNull). */
export function isReportFilterNullOperation(operationCode: string | null | undefined): boolean {
  const op = (operationCode ?? '').trim().toLowerCase();
  return op === 'isnull' || op === 'isnotnull';
}

/** Операторы сравнения: одно значение в поле «Значение» (без мультивыбора). */
export function isReportSingleValueFilterOperation(operationCode: string | null | undefined): boolean {
  const op = (operationCode ?? '').trim().toLowerCase();
  return op === 'eq' || op === 'ne' || op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte';
}

/** Лимит значений в «Значение»: 1 для операторов сравнения; для enum без оператора — 1; иначе без лимита. */
export function resolveReportFilterValueMaxValues(
  filterOperationCode: string | null | undefined,
  defaultMultiple: boolean,
  isBooleanValueField = false,
): number | undefined {
  if (isBooleanValueField) return undefined;
  if (isReportSingleValueFilterOperation(filterOperationCode)) return 1;
  if ((filterOperationCode ?? '').trim()) return undefined;
  if (!defaultMultiple) return 1;
  return undefined;
}
