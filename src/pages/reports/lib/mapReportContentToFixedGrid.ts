import { buildReportTableColumnDefs, REPORT_TABLE_COLUMN_META } from './reportTableColumns';
import { extractReportVehicleRecord } from './extractReportVehicleRecord';
import { formatReportTableDateTime } from './formatReportTableDateTime';

import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import type { ReportTableColumnKey } from './reportTableColumns';

export type ReportGridRow = Record<string, string> & { __rowKey: string };

function pickRowValue(
  row: Record<string, unknown>,
  field: ReportTableColumnKey,
): unknown {
  const source = extractReportVehicleRecord(row);

  if (field in source && source[field] != null) {
    return source[field];
  }
  if (field === 'lastModifiedAt') {
    return source.lastModifiedAt ?? source.lastModifiedA;
  }
  if (field in row && row[field] != null) {
    return row[field];
  }
  return source[field];
}

function formatCellValue(
  field: ReportTableColumnKey,
  raw: unknown,
  labelMaps?: ReportVehicleLabelMaps,
): string {
  if (raw == null || raw === '') {
    return '—';
  }

  const meta = REPORT_TABLE_COLUMN_META.find((c) => c.field === field);
  if (meta?.isDateTime) {
    return formatReportTableDateTime(raw);
  }

  if (field === 'type' && typeof raw === 'string') {
    return labelMaps?.types[raw] ?? raw;
  }
  if (field === 'color' && typeof raw === 'string') {
    return labelMaps?.colors[raw] ?? raw;
  }

  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  return String(raw);
}

export function mapReportContentToFixedGrid(
  content: Record<string, unknown>[],
  rowIdOffset = 0,
  labelMaps?: ReportVehicleLabelMaps,
) {
  const columns = buildReportTableColumnDefs();

  const rows: ReportGridRow[] = content.map((row, index) => {
    const recordId = pickRowValue(row, 'id');
    const __rowKey = `${recordId ?? 'row'}-${rowIdOffset + index}`;

    const flat = {} as ReportGridRow;
    flat.__rowKey = __rowKey;

    for (const { field } of REPORT_TABLE_COLUMN_META) {
      flat[field] = formatCellValue(field, pickRowValue(row, field), labelMaps);
    }

    return flat;
  });

  return { columns, rows };
}

export function getReportGridRowId(row: ReportGridRow): string {
  return row.__rowKey;
}
