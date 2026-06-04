import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';

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

  const columns: GridColDef[] = columnKeys.map((key) => {
    const fieldDef = findReportFieldDefForColumnKey(
      key,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
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
          referenceEntityMetadataByName,
          entities,
          t,
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
