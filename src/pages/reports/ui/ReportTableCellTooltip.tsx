import type { ReactNode } from 'react';

import { REPORT_EMPTY_DISPLAY } from '@pages/reports/lib/reportDisplayValue';
import { OverflowTooltip } from '@shared/ui/overflow_tooltip/OverflowTooltip';

import styles from './Reports.module.scss';

function formatReportCellTooltipTitle(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    return value
      .map((item) => (item == null ? '' : String(item).trim()))
      .filter(Boolean)
      .join(', ');
  }
  return String(value).trim();
}

type ReportTableCellTooltipProps = {
  value: unknown;
  children?: ReactNode;
};

/** Tooltip с полным значением для обрезанных ячеек таблицы отчётов. */
export function ReportTableCellTooltip({ value, children }: ReportTableCellTooltipProps) {
  const title = formatReportCellTooltipTitle(value);
  const display = children ?? title;

  if (!title || title === REPORT_EMPTY_DISPLAY) {
    return (
      <span className={styles.reportTableCellEllipsis} data-report-cell-ellipsis="true">
        {display}
      </span>
    );
  }

  return (
    <OverflowTooltip title={title}>
      <span className={styles.reportTableCellEllipsis} data-report-cell-ellipsis="true">
        {display}
      </span>
    </OverflowTooltip>
  );
}
