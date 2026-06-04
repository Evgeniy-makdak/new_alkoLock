import { REPORT_EMPTY_DISPLAY, finalizeReportCellDisplay, isReportEmptyValue } from './reportDisplayValue';

/** ДД.ММ.ГГГГ ЧЧ:ММ для ячеек отчёта. */
export function formatReportTableDateTime(value: unknown): string {
  if (isReportEmptyValue(value)) {
    return REPORT_EMPTY_DISPLAY;
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return finalizeReportCellDisplay(String(value));
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}`;
}
