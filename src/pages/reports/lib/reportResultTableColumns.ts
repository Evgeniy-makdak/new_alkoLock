import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportFieldDefinition, ReportOutputRow } from '../types/reportApiTypes';

export type ReportResultColumnFormat =
  | 'booleanActive'
  | 'vehicleBind'
  | 'vehicleColor'
  | 'vehicleType'
  | 'userGroupNames';

export type ReportResultColumnMeta = {
  field: string;
  labelKey: string;
  isDateTime?: boolean;
  format?: ReportResultColumnFormat;
  minWidth?: number;
};

/** Колонки корневой записи отчёта «по событиям» (дата события; вложенное поле — ТС/алкозамок и т.д.). */
export const DEVICE_EVENT_REPORT_ROW_COLUMNS: ReportResultColumnMeta[] = [
  { field: '__reportRowCreatedAt', labelKey: 'reports.eventRowCreatedAt', isDateTime: true },
];

/** Порядок колонок: от ключевых показателей к второстепенным. */
export const REPORT_RESULT_COLUMNS_BY_REFERENCE: Record<string, ReportResultColumnMeta[]> = {
  MonitoringDevice: [
    { field: 'createdAt', labelKey: 'reports.nestedProp.createdAt', isDateTime: true },
    { field: 'lastModifiedAt', labelKey: 'reports.nestedProp.lastModifiedAt', isDateTime: true },
    { field: 'id', labelKey: 'reports.nestedProp.id', minWidth: 100 },
    { field: 'name', labelKey: 'reports.nestedProp.name' },
    { field: 'serialNumber', labelKey: 'reports.nestedProp.serialNumber', minWidth: 160 },
    { field: 'vehicleBind', labelKey: 'reports.nestedProp.vehicleBind', format: 'vehicleBind', minWidth: 180 },
    { field: 'isActive', labelKey: 'reports.nestedProp.activity', format: 'booleanActive' },
  ],
  Vehicle: [
    { field: 'createdAt', labelKey: 'reports.nestedProp.createdAt', isDateTime: true },
    { field: 'lastModifiedAt', labelKey: 'reports.nestedProp.lastModifiedAt', isDateTime: true },
    { field: 'id', labelKey: 'reports.vehicleId', minWidth: 100 },
    { field: 'registrationNumber', labelKey: 'form.stateNumber' },
    { field: 'manufacturer', labelKey: 'form.make' },
    { field: 'model', labelKey: 'form.model' },
    { field: 'year', labelKey: 'form.yearOfManufacture', minWidth: 110 },
    { field: 'vin', labelKey: 'reports.vehicleVin', minWidth: 160 },
    { field: 'type', labelKey: 'form.type', format: 'vehicleType' },
    { field: 'color', labelKey: 'form.color', format: 'vehicleColor' },
    { field: 'isActive', labelKey: 'reports.nestedProp.activity', format: 'booleanActive' },
  ],
  User: [
    { field: 'createdAt', labelKey: 'reports.nestedProp.createdAt', isDateTime: true },
    { field: 'lastModifiedAt', labelKey: 'reports.nestedProp.lastModifiedAt', isDateTime: true },
    { field: 'id', labelKey: 'reports.nestedProp.id', minWidth: 100 },
    { field: 'fullName', labelKey: 'reports.nestedProp.fullName' },
    { field: 'login', labelKey: 'form.login', minWidth: 160 },
    { field: 'email', labelKey: 'form.email', minWidth: 180 },
    { field: 'phone', labelKey: 'reports.nestedProp.phone', minWidth: 140 },
    { field: 'groupNames', labelKey: 'reports.nestedProp.groupRole', format: 'userGroupNames', minWidth: 200 },
    { field: 'isActive', labelKey: 'reports.nestedProp.activity', format: 'booleanActive' },
  ],
  DeviceAction: [
    { field: 'occurredAt', labelKey: 'reports.nestedProp.timestamp', isDateTime: true },
    { field: 'startedAt', labelKey: 'reports.nestedProp.timestamp', isDateTime: true },
    { field: 'id', labelKey: 'reports.nestedProp.id', minWidth: 100 },
    { field: 'type', labelKey: 'reports.nestedProp.type' },
    { field: 'status', labelKey: 'reports.nestedProp.status' },
    { field: 'label', labelKey: 'reports.nestedProp.eventTypeLabel' },
  ],
  EventsForFront: [
    { field: 'id', labelKey: 'reports.nestedProp.id', minWidth: 100 },
    { field: 'label', labelKey: 'reports.nestedProp.eventTypeLabel' },
  ],
  BranchOffice: [
    { field: 'id', labelKey: 'reports.nestedProp.id', minWidth: 100 },
    { field: 'name', labelKey: 'reports.nestedProp.name' },
  ],
};

export function getReportResultColumnMeta(
  primaryField: ReportFieldDefinition | null | undefined,
): ReportResultColumnMeta[] | null {
  const ref = primaryField?.referenceEntity?.trim();
  if (!ref) return null;
  return REPORT_RESULT_COLUMNS_BY_REFERENCE[ref] ?? null;
}

function matchReportResultColumnMeta(
  columnKey: string,
  columnMeta: ReportResultColumnMeta[],
  nestedPrefix: string | undefined,
): ReportResultColumnMeta | undefined {
  if (nestedPrefix && columnKey.startsWith(`${nestedPrefix}.`)) {
    const sub = columnKey.slice(nestedPrefix.length + 1);
    return columnMeta.find((m) => m.field === sub);
  }
  return columnMeta.find((m) => m.field === columnKey);
}

/**
 * Мета форматирования колонки по ключу из content (например vehicle.type → Vehicle).
 * Не зависит от «последней» строки фильтра (primary).
 */
function resolveVehicleNestedPrefix(
  columnKey: string,
  fields: ReportFieldDefinition[],
): string | undefined {
  if (!columnKey.includes('.')) return undefined;
  for (const field of fields) {
    const prefix = field.fieldName?.trim();
    if (!prefix || field.referenceEntity?.trim() !== 'Vehicle') continue;
    if (columnKey === prefix || columnKey.startsWith(`${prefix}.`)) {
      return prefix;
    }
  }
  return undefined;
}

export function findReportResultColumnMetaForKey(
  columnKey: string,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  primaryField: ReportFieldDefinition | null | undefined,
  entityFields: ReportFieldDefinition[] = [],
): ReportResultColumnMeta | undefined {
  const vehicleMeta = REPORT_RESULT_COLUMNS_BY_REFERENCE.Vehicle;
  const allFields = [...entityFields, ...Array.from(fieldMap.values())];
  const vehiclePrefix = resolveVehicleNestedPrefix(columnKey, allFields);
  if (vehiclePrefix && vehicleMeta) {
    const sub = columnKey.slice(vehiclePrefix.length + 1);
    const hit = vehicleMeta.find((m) => m.field === sub);
    if (hit) return hit;
  }

  for (const row of outputRows) {
    const outputKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    if (!outputKey) continue;
    const outputField = fieldMap.get(outputKey);
    const columnMeta = getReportResultColumnMeta(outputField);
    if (!columnMeta?.length) continue;
    const found = matchReportResultColumnMeta(columnKey, columnMeta, outputField?.fieldName);
    if (found) return found;
  }

  const fallbackMeta = getReportResultColumnMeta(primaryField);
  if (!fallbackMeta?.length) return undefined;
  return matchReportResultColumnMeta(columnKey, fallbackMeta, primaryField?.fieldName);
}

/** Опции «Поля в отчёте» — те же колонки, что рендерятся в таблице по выбранному «Поле результата». */
export function buildReportTableFieldOptions(
  primaryField: ReportFieldDefinition | null | undefined,
  t: TFunction,
): Values {
  const ref = primaryField?.referenceEntity?.trim();
  if (ref) {
    const columns = REPORT_RESULT_COLUMNS_BY_REFERENCE[ref] ?? [];
    return columns
      .filter((col) => col.field !== '__reportRowCreatedAt')
      .map((col) => ({
        value: col.field,
        label: t(col.labelKey),
      }));
  }
  if (primaryField) {
    return [
      {
        value: primaryField.fieldName,
        label: primaryField.label || primaryField.fieldName,
      },
    ];
  }
  return [];
}

export function buildReportResultColumnDefs(
  columnMeta: ReportResultColumnMeta[],
  t: TFunction,
): GridColDef[] {
  return columnMeta.map(({ field, labelKey, minWidth }) => ({
    field,
    headerName: t(labelKey),
    flex: 1,
    minWidth: minWidth ?? 160,
    sortable: true,
  }));
}
