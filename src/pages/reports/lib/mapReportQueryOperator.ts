/** UI/POST: оператор «В диапазоне» из metadata.availableOperations. */
export function isReportDateTimeBetweenOperation(operationCode: string | null | undefined): boolean {
  return (operationCode ?? '').trim().toLowerCase() === 'between';
}

/** Операторы без values в filters[] (metadata: isNull, isNotNull). */
export function isReportFilterNullOperation(operationCode: string | null | undefined): boolean {
  const op = (operationCode ?? '').trim().toLowerCase();
  return op === 'isnull' || op === 'isnotnull';
}
