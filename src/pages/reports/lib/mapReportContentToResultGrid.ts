import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';

import { extractUserGroupNames } from './buildNestedEntityAttributeOptions';
import { extractReportNestedRecord } from './extractReportNestedRecord';
import { formatReportTableDateTime } from './formatReportTableDateTime';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import {
  buildReportResultColumnDefs,
  DEVICE_EVENT_REPORT_ROW_COLUMNS,
  getReportResultColumnMeta,
  type ReportResultColumnFormat,
  type ReportResultColumnMeta,
} from './reportResultTableColumns';
import { mapReportContentToGrid } from './mapReportResultToGrid';

import type { ReportFieldDefinition } from '../types/reportApiTypes';
import type { ReportGridRow } from './mapReportContentToFixedGrid';

import { Formatters } from '@shared/utils/formatters';
import type { ICar } from '@shared/types/BaseQueryTypes';

const DEVICE_EVENT_TIME_KEYS = ['createdAt', 'timestamp', 'eventTime', 'occurredAt', 'dateOccurrent'];

function pickReportRootValue(
  row: Record<string, unknown>,
  field: string,
  nestedKey: string,
): unknown {
  if (field === '__reportRowCreatedAt') {
    for (const key of DEVICE_EVENT_TIME_KEYS) {
      const value = row[key];
      if (value != null && value !== '') return value;
    }
    for (const key of DEVICE_EVENT_TIME_KEYS) {
      const value = row[`${nestedKey}.${key}`];
      if (value != null && value !== '') return value;
    }
    return null;
  }
  return null;
}

function pickNestedValue(source: Record<string, unknown>, field: string): unknown {
  if (field === 'groupNames') {
    return extractUserGroupNames(source);
  }
  if (field in source && source[field] != null) {
    return source[field];
  }
  if (field === 'lastModifiedAt') {
    return source.lastModifiedAt ?? source.lastModifiedA;
  }
  return source[field];
}

function formatVehicleBind(raw: unknown): string {
  if (raw == null) return '—';
  if (typeof raw !== 'object') return String(raw);
  const bind = raw as { vehicle?: unknown };
  if (bind.vehicle != null && typeof bind.vehicle === 'object') {
    return Formatters.carNameFormatter(bind.vehicle as ICar, false, true, false) || '—';
  }
  return '—';
}

function formatResultCellValue(
  field: string,
  raw: unknown,
  meta: ReportResultColumnMeta | undefined,
  labelMaps?: ReportVehicleLabelMaps,
  t?: TFunction,
): string {
  if (raw == null || raw === '') {
    return '—';
  }

  if (meta?.isDateTime) {
    return formatReportTableDateTime(raw);
  }

  const format = meta?.format as ReportResultColumnFormat | undefined;
  if (format === 'vehicleBind') {
    return formatVehicleBind(raw);
  }
  if (format === 'booleanActive') {
    const active = raw === true || raw === 'true';
    return t ? (active ? t('reports.table.activeYes') : t('reports.table.activeNo')) : active ? 'Да' : 'Нет';
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

  if (typeof raw === 'boolean') {
    return raw ? (t ? t('reports.table.activeYes') : 'Да') : t ? t('reports.table.activeNo') : 'Нет';
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw);
  }
  return String(raw);
}

export function mapReportContentToResultGrid(
  content: Record<string, unknown>[],
  primaryField: ReportFieldDefinition | null,
  rowIdOffset: number,
  t: TFunction,
  labelMaps?: ReportVehicleLabelMaps,
  reportEntityName?: string | null,
): { columns: GridColDef[]; rows: ReportGridRow[] } {
  const refColumns = getReportResultColumnMeta(primaryField) ?? [];
  const columnMeta =
    reportEntityName === 'DeviceEvent' && primaryField?.referenceEntity
      ? [...DEVICE_EVENT_REPORT_ROW_COLUMNS, ...refColumns]
      : refColumns;

  if (!columnMeta.length || !primaryField) {
    if (!primaryField || !content.length) {
      return { columns: [], rows: [] };
    }
    const { columns, rows } = mapReportContentToGrid(content, [primaryField], rowIdOffset);
    const gridRows: ReportGridRow[] = rows.map((row, index) => ({
      ...(row as Record<string, string>),
      __rowKey: String((row as { id?: unknown }).id ?? `row-${rowIdOffset + index}`),
    }));
    return { columns, rows: gridRows };
  }

  const nestedKey = primaryField.fieldName;
  const columns = buildReportResultColumnDefs(columnMeta, t);
  const metaByField = new Map(columnMeta.map((m) => [m.field, m]));

  const rows: ReportGridRow[] = content.map((row, index) => {
    const source = extractReportNestedRecord(row, nestedKey);
    const rootId = row.id;
    const __rowKey =
      rootId != null && rootId !== ''
        ? `report-row-${String(rootId)}`
        : `report-row-${rowIdOffset + index}`;

    const flat = {} as ReportGridRow;
    flat.__rowKey = __rowKey;

    for (const { field } of columnMeta) {
      const raw =
        field === '__reportRowCreatedAt'
          ? pickReportRootValue(row, field, nestedKey)
          : pickNestedValue(source, field);
      flat[field] = formatResultCellValue(field, raw, metaByField.get(field), labelMaps, t);
    }

    return flat;
  });

  return { columns, rows };
}

export function getReportGridRowId(row: ReportGridRow): string {
  return row.__rowKey;
}
