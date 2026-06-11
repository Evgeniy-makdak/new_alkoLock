export type ReportComposeGroupRow = {
  id: string;
  columnKey: string;
};

export function createReportComposeGroupRow(columnKey = ''): ReportComposeGroupRow {
  return {
    id: `report-group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    columnKey,
  };
}
