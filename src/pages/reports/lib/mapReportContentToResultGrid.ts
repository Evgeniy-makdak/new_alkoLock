import { createElement } from 'react';
import type { TFunction } from 'i18next';
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';

import { extractUserGroupNames } from './buildNestedEntityAttributeOptions';
import {
  collectReportContentColumnKeys,
  findReportFieldDefForColumnKey,
  orderReportContentColumnKeys,
  resolveReportColumnLabel,
} from './buildReportTableFieldOptions';
import {
  formatReportCompositeCellValue,
  planReportCompositeResultColumns,
} from './reportEntityCompositeFields';
import { COORDINATES_COMPOSITE_KIND } from './reportCoordinateComposite';
import {
  parseReportCoordinatePairFromDisplay,
  readReportRowCoordinatePair,
  readReportRowEventId,
  readReportRowVehicleRegistration,
} from './reportCoordinateMapLink';
import { ReportCoordinateMapCell } from '../ui/ReportCoordinateMapCell';
import { ReportTableCellTooltip } from '../ui/ReportTableCellTooltip';
import { isReportSortAllowedWithGroupBy } from './buildReportSortParam';
import { resolveReportColumnHeaderLabel } from './reportSelectedFieldAliases';
import { formatReportCoordinateDisplay } from './formatReportCoordinateInput';
import { formatReportTableDateTime } from './formatReportTableDateTime';
import {
  REPORT_EMPTY_DISPLAY,
  finalizeReportCellDisplay,
  formatReportCarDisplay,
  isReportEmptyValue,
} from './reportDisplayValue';
import { extractVehicleCarFromRecord } from './reportVehicleBindLabel';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { isReportCoordinateField, isReportDateTimeField } from './reportFieldFilterKind';
import {
  findReportResultColumnMetaForKey,
  type ReportResultColumnFormat,
  type ReportResultColumnMeta,
} from './reportResultTableColumns';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';
import type { ReportGridRow } from './mapReportContentToFixedGrid';

function buildReportGridRowKey(
  row: Record<string, unknown>,
  index: number,
  rowIdOffset: number,
): string {
  const rootId = row.id;
  return rootId != null && rootId !== ''
    ? `report-row-${String(rootId)}`
    : `report-row-${rowIdOffset + index}`;
}

function formatVehicleBind(raw: unknown): string {
  if (isReportEmptyValue(raw) || typeof raw !== 'object') {
    return REPORT_EMPTY_DISPLAY;
  }
  const car = extractVehicleCarFromRecord(raw);
  if (!car) return REPORT_EMPTY_DISPLAY;
  return formatReportCarDisplay(car);
}

function formatFromStaticMeta(
  raw: unknown,
  meta: ReportResultColumnMeta | undefined,
  labelMaps: ReportVehicleLabelMaps | undefined,
  t: TFunction,
): string | null {
  if (!meta) return null;
  if (isReportEmptyValue(raw)) return REPORT_EMPTY_DISPLAY;
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
    return names.length ? names.join(', ') : REPORT_EMPTY_DISPLAY;
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
  entityFields: ReportFieldDefinition[],
  labelMaps: ReportVehicleLabelMaps | undefined,
  t: TFunction,
): string {
  if (isReportEmptyValue(raw)) return REPORT_EMPTY_DISPLAY;

  const staticMeta = findReportResultColumnMetaForKey(
    columnKey,
    outputRows,
    fieldMap,
    primaryField,
    entityFields,
  );
  const fromStatic = formatFromStaticMeta(raw, staticMeta, labelMaps, t);
  if (fromStatic != null) return finalizeReportCellDisplay(fromStatic);

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
    return finalizeReportCellDisplay(JSON.stringify(raw));
  }
  if (labelMaps && typeof raw === 'string') {
    const leaf = columnKey.includes('.') ? columnKey.slice(columnKey.lastIndexOf('.') + 1) : columnKey;
    if (leaf === 'type') {
      return finalizeReportCellDisplay(labelMaps.types[raw] ?? raw);
    }
    if (leaf === 'color') {
      return finalizeReportCellDisplay(labelMaps.colors[raw] ?? raw);
    }
  }
  return finalizeReportCellDisplay(String(raw));
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
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
  selectedFieldsForColumnOrder?: ReportSelectedFieldPayload[],
  entities: ReportEntityListItem[] = [],
  groupBy?: string[],
): { columns: GridColDef[]; rows: ReportGridRow[] } {
  if (!content.length) {
    return { columns: [], rows: [] };
  }

  const contentKeys = collectReportContentColumnKeys(content);
  const orderedKeys = orderReportContentColumnKeys(
    contentKeys,
    selectedFieldsForColumnOrder?.map((f) => f.fieldName),
  );
  const { displayColumnKeys: columnKeys, groups: compositeGroups } =
    planReportCompositeResultColumns(orderedKeys, selectedFieldsForColumnOrder?.map((f) => f.fieldName));
  const compositeByKey = new Map(compositeGroups.map((g) => [g.compositeKey, g]));

  const rawRowByGridKey = new Map<string, Record<string, unknown>>();
  content.forEach((row, index) => {
    rawRowByGridKey.set(buildReportGridRowKey(row, index, rowIdOffset), row);
  });

  const columns: GridColDef[] = columnKeys.map((key) => {
    const fieldDef = findReportFieldDefForColumnKey(
      key,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    );
    const compositeGroup = compositeByKey.get(key);
    const colDef: GridColDef = {
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
          referenceEntityMetadataByName,
          entities,
          t,
        ),
      ),
      flex: 1,
      minWidth: 160,
      sortable:
        fieldDef?.sortable !== false && isReportSortAllowedWithGroupBy(key, groupBy),
    };

    if (compositeGroup?.kind === COORDINATES_COMPOSITE_KIND) {
      const prefix = compositeGroup.prefix;
      colDef.minWidth = 210;
      colDef.renderCell = (params: GridRenderCellParams<ReportGridRow>) => {
        const rawRow = rawRowByGridKey.get(params.row.__rowKey);
        if (!rawRow) {
          return params.formattedValue ?? params.value ?? REPORT_EMPTY_DISPLAY;
        }
        const pair =
          readReportRowCoordinatePair(rawRow, prefix) ??
          parseReportCoordinatePairFromDisplay(params.formattedValue ?? params.value);
        if (!pair) {
          return params.formattedValue ?? params.value ?? REPORT_EMPTY_DISPLAY;
        }
        const vehicle = readReportRowVehicleRegistration(rawRow, prefix);
        const eventId = readReportRowEventId(rawRow, prefix);
        return createElement(ReportCoordinateMapCell, { pair, vehicle, eventId });
      };
    } else {
      colDef.renderCell = (params: GridRenderCellParams<ReportGridRow>) => {
        const display = params.formattedValue ?? params.value ?? REPORT_EMPTY_DISPLAY;
        return createElement(ReportTableCellTooltip, { value: display, children: display });
      };
    }

    return colDef;
  });

  const rows: ReportGridRow[] = content.map((row, index) => {
    const __rowKey = buildReportGridRowKey(row, index, rowIdOffset);

    const flat = { __rowKey } as ReportGridRow;

    for (const key of columnKeys) {
      const compositeGroup = compositeByKey.get(key);
      if (compositeGroup) {
        flat[key] = formatReportCompositeCellValue(compositeGroup, row);
        continue;
      }
      const fieldDef = findReportFieldDefForColumnKey(
        key,
        entityMetadata,
        outputRows,
        fieldMap,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
      );
      flat[key] = formatDynamicCellValue(
        key,
        row[key],
        fieldDef,
        primaryField,
        outputRows,
        fieldMap,
        entityMetadata?.fields ?? [],
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
