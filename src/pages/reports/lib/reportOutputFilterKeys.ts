import { PRIMARY_REPORT_OUTPUT_ROW_ID } from './reportOutputRow';

/** Ключи операции/функции для строки фильтров отчёта (в filterSelections строки). */
export function reportOutputOperationKey(rowId: string): string {
  return `__report_output_operation__${rowId}`;
}

export function reportOutputFunctionKey(rowId: string): string {
  return `__report_output_function__${rowId}`;
}

/** @deprecated Используйте reportOutputOperationKey(PRIMARY_REPORT_OUTPUT_ROW_ID) */
export const REPORT_OUTPUT_OPERATION_KEY = reportOutputOperationKey(
  PRIMARY_REPORT_OUTPUT_ROW_ID,
);

/** @deprecated Используйте reportOutputFunctionKey(PRIMARY_REPORT_OUTPUT_ROW_ID) */
export const REPORT_OUTPUT_FUNCTION_KEY = reportOutputFunctionKey(PRIMARY_REPORT_OUTPUT_ROW_ID);
