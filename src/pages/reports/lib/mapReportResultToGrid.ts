import type { GridColDef } from '@mui/x-data-grid';

import { finalizeReportCellDisplay, isReportEmptyValue, REPORT_EMPTY_DISPLAY } from './reportDisplayValue';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

export function mapReportContentToGrid(
  content: Record<string, unknown>[],
  selectedFields: ReportFieldDefinition[],
  rowIdOffset = 0,
) {
  if (!content.length) {
    return { columns: [] as GridColDef[], rows: [] as { id: string | number }[] };
  }

  const labelByKey = new Map<string, string>();
  for (const f of selectedFields) {
    const key = f.alias || f.fieldName;
    labelByKey.set(key, f.label || f.fieldName);
    labelByKey.set(f.fieldName, f.label || f.fieldName);
  }

  const sampleKeys =
    selectedFields.length > 0
      ? selectedFields.map((f) => f.alias || f.fieldName)
      : Object.keys(content[0] ?? {});

  const columns: GridColDef[] = sampleKeys.map((key) => ({
    field: key,
    headerName: labelByKey.get(key) ?? key,
    flex: 1,
    minWidth: 140,
    sortable: true,
  }));

  const rows = content.map((row, index) => {
    const flat: Record<string, unknown> = { id: rowIdOffset + index };
    for (const key of sampleKeys) {
      const val = row[key] ?? row[labelByKey.get(key) ?? ''];
      flat[key] = isReportEmptyValue(val)
        ? REPORT_EMPTY_DISPLAY
        : typeof val === 'object'
          ? finalizeReportCellDisplay(JSON.stringify(val))
          : finalizeReportCellDisplay(String(val));
    }
    return flat;
  });

  return { columns, rows };
}
