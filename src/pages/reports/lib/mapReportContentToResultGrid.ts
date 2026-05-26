import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { extractUserGroupNames } from './buildNestedEntityAttributeOptions';
import {
  collectReportContentColumnKeys,
  findReportFieldDefForColumnKey,
  resolveReportColumnLabel,
} from './buildReportTableFieldOptions';
import { resolveReportColumnHeaderLabel } from './reportSelectedFieldAliases';
import { formatReportCoordinateDisplay } from './formatReportCoordinateInput';
import { formatReportTableDateTime } from './formatReportTableDateTime';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { isReportCoordinateField, isReportDateTimeField } from './reportFieldFilterKind';
import {
  findReportResultColumnMetaForKey,
  type ReportResultColumnFormat,
  type ReportResultColumnMeta,
} from './reportResultTableColumns';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
} from '../types/reportApiTypes';
import type { ReportGridRow } from './mapReportContentToFixedGrid';

import { Formatters } from '@shared/utils/formatters';
import type { ICar } from '@shared/types/BaseQueryTypes';

function formatVehicleBind(raw: unknown): string {
  if (raw == null) return '—';
  if (typeof raw !== 'object') return String(raw);
  const bind = raw as { vehicle?: unknown };
  if (bind.vehicle != null && typeof bind.vehicle === 'object') {
    return Formatters.carNameFormatter(bind.vehicle as ICar, false, true, false) || '—';
  }
  return '—';
}

function formatFromStaticMeta(
  raw: unknown,
  meta: ReportResultColumnMeta | undefined,
  labelMaps: ReportVehicleLabelMaps | undefined,
  t: TFunction,
): string | null {
  if (!meta) return null;
  if (raw == null || raw === '') return '—';
  if (meta.isDateTime) return formatReportTableDateTime(raw);

  const format = meta.format as ReportResultColumnFormat | undefined;
  if (format === 'vehicleBind') return formatVehicleBind(raw);
  if (format === 'booleanActive') {
    const active = raw === true || raw === 'true';
    return active ? t('reports.table.activeYes') : t('reports.table.activeNo');
  }
  if (format === 'vehicleType' && typeof raw === 'string') {
    return labelMaps?.types[raw] ?? raw;
  }
  if (format === 'vehicleColor' && typeof raw === 'string') {
    return labelMaps?.colors[raw] ?? raw;
  }
  if (format === 'userGroupNames') {
    const names = Array.isArray(raw) ? raw.map(String) : extractUserGroupNames(raw);
    return names.length ? names.join(', ') : '—';
  }
  return null;
}

function formatDynamicCellValue(
  columnKey: string,
  raw: unknown,
  fieldDef: ReportFieldDefinition | undefined,
  primaryField: ReportFieldDefinition | null,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  labelMaps: ReportVehicleLabelMaps | undefined,
  t: TFunction,
): string {
  if (raw == null || raw === '') return '—';

  const staticMeta = findReportResultColumnMetaForKey(
    columnKey,
    outputRows,
    fieldMap,
    primaryField,
  );
  const fromStatic = formatFromStaticMeta(raw, staticMeta, labelMaps, t);
  if (fromStatic != null) return fromStatic;

  if (fieldDef && isReportDateTimeField(fieldDef)) {
    return formatReportTableDateTime(raw);
  }

  if (fieldDef && isReportCoordinateField(fieldDef)) {
    return formatReportCoordinateDisplay(raw);
  }

  if (typeof raw === 'boolean') {
    return raw ? t('reports.table.activeYes') : t('reports.table.activeNo');
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  return String(raw);
}

/** Колонки и строки таблицы строго по ключам из content ответа query. */
export function mapReportContentToResultGrid(
  content: Record<string, unknown>[],
  primaryField: ReportFieldDefinition | null,
  rowIdOffset: number,
  t: TFunction,
  labelMaps?: ReportVehicleLabelMaps,
  entityMetadata?: ReportEntityMetadata | null,
  outputRows: ReportOutputRow[] = [],
  fieldMap: Map<string, ReportFieldDefinition> = new Map(),
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null> = {},
  columnAliases: Map<string, string> = new Map(),
): { columns: GridColDef[]; rows: ReportGridRow[] } {
  if (!content.length) {
    return { columns: [], rows: [] };
  }

  const columnKeys = collectReportContentColumnKeys(content);

  const columns: GridColDef[] = columnKeys.map((key) => {
    const fieldDef = findReportFieldDefForColumnKey(
      key,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
    );
    return {
      field: key,
      headerName: resolveReportColumnHeaderLabel(
        key,
        columnAliases,
        resolveReportColumnLabel(
          key,
          entityMetadata,
          outputRows,
          fieldMap,
          tableMetadataByRowId,
        ),
      ),
      flex: 1,
      minWidth: 140,
      sortable: fieldDef?.sortable !== false,
    };
  });

  const rows: ReportGridRow[] = content.map((row, index) => {
    const rootId = row.id;
    const __rowKey =
      rootId != null && rootId !== ''
        ? `report-row-${String(rootId)}`
        : `report-row-${rowIdOffset + index}`;

    const flat = { __rowKey } as ReportGridRow;

    for (const key of columnKeys) {
      const fieldDef = findReportFieldDefForColumnKey(
        key,
        entityMetadata,
        outputRows,
        fieldMap,
        tableMetadataByRowId,
      );
      flat[key] = formatDynamicCellValue(
        key,
        row[key],
        fieldDef,
        primaryField,
        outputRows,
        fieldMap,
        labelMaps,
        t,
      );
    }

    return flat;
  });

  return { columns, rows };
}

export function getReportGridRowId(row: ReportGridRow): string {
  return row.__rowKey;
}
