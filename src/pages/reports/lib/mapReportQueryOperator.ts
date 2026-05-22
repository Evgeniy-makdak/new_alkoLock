import type { ReportFieldDefinition } from '../types/reportApiTypes';

import { isReportDateTimeField } from './reportFieldFilterKind';

/**
 * Коды из metadata (after, before) → операторы, которые принимает query API отчётов
 * (как в JHipster-фильтрах: greaterThanOrEqual / lessThanOrEqual).
 */
const DATETIME_UI_OPERATOR_TO_API: Record<string, string> = {
  after: 'greaterThanOrEqual',
  before: 'lessThanOrEqual',
};

export function isReportDateTimeBetweenOperation(operationCode: string | null | undefined): boolean {
  return (operationCode ?? '').trim().toLowerCase() === 'between';
}

/** Оператор для POST …/reports/{entity}/query. */
export function mapReportQueryOperator(
  uiCode: string,
  field?: ReportFieldDefinition,
): string {
  const lower = uiCode.trim().toLowerCase();
  if (field && isReportDateTimeField(field) && DATETIME_UI_OPERATOR_TO_API[lower]) {
    return DATETIME_UI_OPERATOR_TO_API[lower];
  }
  return uiCode;
}
