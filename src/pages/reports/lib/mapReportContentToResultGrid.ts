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
import {
  COORDINATES_COMPOSITE_KIND,
  formatReportCoordinatesCompositeCellValue,
} from './reportCoordinateComposite';
import {
  parseReportCoordinatePairFromDisplay,
  readReportRowCoordinatePair,
  readReportRowEventId,
  readReportRowVehicleRegistration,
} from './reportCoordinateMapLink';
import { ReportCoordinateMapCell } from '../ui/ReportCoordinateMapCell';
import { ReportTableCellTooltip } from '../ui/ReportTableCellTooltip';
import {
  applyReportAggregationHeaderLabel,
  buildReportFieldAggregationMap,
  buildReportGroupBySet,
  formatAggregatedReportCoordinateCountValue,
  resolveReportColumnDisplayAggregation,
  shouldRenderReportCoordinateAsMap,
  isReportFieldAggregatedForDisplay,
} from './reportAggregationDisplay';
import {
  resolveReportColumnHeaderLabel,
  resolveReportContentFieldName,
} from './reportSelectedFieldAliases';
import { formatReportCoordinateDisplay } from './formatReportCoordinateInput';
import { formatReportTableDateTime, resolveReportDateTimePrecision } from './formatReportTableDateTime';
import {
  REPORT_EMPTY_DISPLAY,
  finalizeReportCellDisplay,
  formatReportCarDisplay,
  isReportEmptyValue,
} from './reportDisplayValue';
import { extractVehicleCarFromRecord } from './reportVehicleBindLabel';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { resolveVehicleAttributeLabel } from './fetchVehicleFrontDataMaps';
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

/**
 * Ключ строки грида. Нельзя брать content.id, если id — агрегация (count):
 * иначе разные группы с одинаковым count схлопываются в DataGrid.
 */
function buildReportGridRowKey(
  row: Record<string, unknown>,
  index: number,
  rowIdOffset: number,
  aggregationMap: Map<string, string>,
): string {
  const rootId = row.id;
  if (
    rootId != null &&
    rootId !== '' &&
    !isReportFieldAggregatedForDisplay('id', aggregationMap)
  ) {
    return `report-row-${String(rootId)}`;
  }
  return `report-row-${rowIdOffset + index}`;
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
  /** Путь колонки (fieldName из состава) — для точности отображения даты/времени. */
  fieldPath?: string,
): string | null {
  if (!meta) return null;
  if (isReportEmptyValue(raw)) return REPORT_EMPTY_DISPLAY;
  if (meta.isDateTime) {
    return formatReportTableDateTime(raw, resolveReportDateTimePrecision(fieldPath));
  }

  const format = meta.format as ReportResultColumnFormat | undefined;
  if (format === 'vehicleBind') return formatVehicleBind(raw);
  if (format === 'booleanActive') {
    const active = raw === true || raw === 'true';
    return active ? t('reports.table.activeYes') : t('reports.table.activeNo');
  }
  if (format === 'vehicleType' && typeof raw === 'string') {
    return resolveVehicleAttributeLabel('type', raw, labelMaps) ?? raw;
  }
  if (format === 'vehicleColor' && typeof raw === 'string') {
    return resolveVehicleAttributeLabel('color', raw, labelMaps) ?? raw;
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
  aggregationMap: Map<string, string>,
  /** fieldName из selectedFields — даже если content-ключ = alias. */
  resolvedFieldName: string = columnKey,
): string {
  if (isReportEmptyValue(raw)) return REPORT_EMPTY_DISPLAY;

  // Тип/цвет ТС — всегда через front-data (и для groupBy-измерений).
  // При многословном alias content-ключ ≠ type/color — берём исходный fieldName.
  if (typeof raw === 'string' && labelMaps) {
    const fieldPath = resolvedFieldName || columnKey;
    const leaf = fieldPath.includes('.')
      ? fieldPath.slice(fieldPath.lastIndexOf('.') + 1)
      : fieldPath;
    if (leaf === 'type') {
      const localized = resolveVehicleAttributeLabel('type', raw, labelMaps);
      if (localized) return finalizeReportCellDisplay(localized);
    }
    if (leaf === 'color') {
      const localized = resolveVehicleAttributeLabel('color', raw, labelMaps);
      if (localized) return finalizeReportCellDisplay(localized);
    }
  }

  const staticMeta = findReportResultColumnMetaForKey(
    resolvedFieldName || columnKey,
    outputRows,
    fieldMap,
    primaryField,
    entityFields,
  );

  if (
    isReportFieldAggregatedForDisplay(columnKey, aggregationMap) ||
    isReportFieldAggregatedForDisplay(resolvedFieldName, aggregationMap)
  ) {
    if (typeof raw === 'boolean') {
      return raw ? t('reports.table.activeYes') : t('reports.table.activeNo');
    }
    // Агрегированные значения Дата/Время (Минимум/Максимум и т.п.): точность
    // округления не меняем (минуты), но приводим сырое ISO с сервера к виду ДД.ММ.ГГГГ ЧЧ:ММ.
    if (staticMeta?.isDateTime || (fieldDef && isReportDateTimeField(fieldDef))) {
      return formatReportTableDateTime(raw);
    }
    return finalizeReportCellDisplay(String(raw));
  }

  const fromStatic = formatFromStaticMeta(raw, staticMeta, labelMaps, t, resolvedFieldName);
  if (fromStatic != null) return finalizeReportCellDisplay(fromStatic);

  if (fieldDef && isReportDateTimeField(fieldDef)) {
    return formatReportTableDateTime(raw, resolveReportDateTimePrecision(resolvedFieldName || columnKey));
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
  /** Ключи с закрытым глазом — не рендерить в гриде (в т.ч. Идентификатор, если скрыт). */
  hiddenColumnKeys: string[] = [],
): { columns: GridColDef[]; rows: ReportGridRow[] } {
  if (!content.length) {
    return { columns: [], rows: [] };
  }

  const aggregationMap = buildReportFieldAggregationMap(selectedFieldsForColumnOrder);
  const groupBySet = buildReportGroupBySet(groupBy);

  const allContentKeys = collectReportContentColumnKeys(content);

  // Скрытые пути из UI (fieldName) + alias ответа.
  // Иначе при alias content-ключ ≠ fieldName и «глаз» перестаёт скрывать колонку.
  // Идентификатор скрываем только если он в hiddenColumnKeys (закрытый глаз).
  const hiddenSet = new Set<string>();
  for (const key of hiddenColumnKeys) {
    const trimmed = String(key).trim();
    if (trimmed) hiddenSet.add(trimmed);
  }
  for (const field of selectedFieldsForColumnOrder ?? []) {
    const fieldName = (field.fieldName ?? '').trim();
    if (!fieldName || !hiddenSet.has(fieldName)) continue;
    const alias = (field.alias ?? '').trim();
    if (alias) hiddenSet.add(alias);
  }
  for (const key of allContentKeys) {
    const resolved = resolveReportContentFieldName(key, selectedFieldsForColumnOrder);
    if (hiddenSet.has(resolved) || hiddenSet.has(key)) {
      hiddenSet.add(key);
    }
  }

  const contentKeys = allContentKeys.filter((key) => !hiddenSet.has(key));
  const orderedKeys = orderReportContentColumnKeys(
    contentKeys,
    selectedFieldsForColumnOrder
      ?.map((f) => f.fieldName)
      .filter((name) => name && !hiddenSet.has(name)),
  );
  const { displayColumnKeys: rawColumnKeys, groups: compositeGroups } =
    planReportCompositeResultColumns(
      orderedKeys,
      selectedFieldsForColumnOrder
        ?.map((f) => f.fieldName)
        .filter((name) => name && !hiddenSet.has(name)),
    );
  const columnKeys = rawColumnKeys.filter((key) => !hiddenSet.has(key));
  const compositeByKey = new Map(compositeGroups.map((g) => [g.compositeKey, g]));

  const rawRowByGridKey = new Map<string, Record<string, unknown>>();
  content.forEach((row, index) => {
    rawRowByGridKey.set(buildReportGridRowKey(row, index, rowIdOffset, aggregationMap), row);
  });

  const columns: GridColDef[] = columnKeys.map((key) => {
    const resolvedFieldName = resolveReportContentFieldName(key, selectedFieldsForColumnOrder);
    const fieldDef = findReportFieldDefForColumnKey(
      resolvedFieldName,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    );
    const compositeGroup = compositeByKey.get(key);
    const columnAggregation = resolveReportColumnDisplayAggregation(
      resolvedFieldName,
      compositeGroup,
      aggregationMap,
      groupBySet,
    );
    const baseHeaderLabel = resolveReportColumnHeaderLabel(
      key,
      columnAliases,
      resolveReportColumnLabel(
        resolvedFieldName,
        entityMetadata,
        outputRows,
        fieldMap,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
        entities,
        t,
      ),
    );
    const colDef: GridColDef = {
      field: key,
      headerName: applyReportAggregationHeaderLabel(baseHeaderLabel, columnAggregation, t),
      flex: 1,
      minWidth: 160,
      // Стрелка грида — для любой колонки состава (как выбор sort в модалке),
      // не только для полей groupBy.
      sortable: fieldDef?.sortable !== false,
    };

    if (compositeGroup?.kind === COORDINATES_COMPOSITE_KIND && shouldRenderReportCoordinateAsMap(compositeGroup, aggregationMap)) {
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
    const __rowKey = buildReportGridRowKey(row, index, rowIdOffset, aggregationMap);

    const flat = { __rowKey } as ReportGridRow;

    for (const key of columnKeys) {
      const compositeGroup = compositeByKey.get(key);
      if (compositeGroup) {
        if (compositeGroup.kind === COORDINATES_COMPOSITE_KIND) {
          if (shouldRenderReportCoordinateAsMap(compositeGroup, aggregationMap)) {
            flat[key] = formatReportCoordinatesCompositeCellValue(compositeGroup.prefix, row);
          } else {
            flat[key] = formatAggregatedReportCoordinateCountValue(compositeGroup, row);
          }
        } else {
          flat[key] = formatReportCompositeCellValue(compositeGroup, row, {
            aggregationMap,
            groupBySet,
          });
        }
        continue;
      }
      const resolvedFieldName = resolveReportContentFieldName(
        key,
        selectedFieldsForColumnOrder,
      );
      const fieldDef = findReportFieldDefForColumnKey(
        resolvedFieldName,
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
        aggregationMap,
        resolvedFieldName,
      );
    }

    return flat;
  });

  return { columns, rows };
}

export function getReportGridRowId(row: ReportGridRow): string {
  return row.__rowKey;
}
