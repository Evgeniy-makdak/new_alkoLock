export type ReportSortDirection = 'ASC' | 'DESC';

export type ReportComposeSortRow = {
  id: string;
  columnKey: string;
  direction: ReportSortDirection;
};

export function createReportComposeSortRow(
  columnKey = '',
  direction: ReportSortDirection = 'ASC',
): ReportComposeSortRow {
  return {
    id: `report-sort-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    columnKey,
    direction,
  };
}
