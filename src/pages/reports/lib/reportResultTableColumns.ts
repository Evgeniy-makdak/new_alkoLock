import type { TFunction } from 'i18next';
import type { GridColDef } from '@mui/x-data-grid';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

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
    { field: 'timestamp', labelKey: 'reports.nestedProp.timestamp', isDateTime: true },
    { field: 'id', labelKey: 'reports.nestedProp.id', minWidth: 100 },
    { field: 'type', labelKey: 'reports.nestedProp.type' },
    { field: 'status', labelKey: 'reports.nestedProp.status' },
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

export function buildReportResultColumnDefs(
  columnMeta: ReportResultColumnMeta[],
  t: TFunction,
): GridColDef[] {
  return columnMeta.map(({ field, labelKey, minWidth }) => ({
    field,
    headerName: t(labelKey),
    flex: 1,
    minWidth: minWidth ?? 120,
    sortable: true,
  }));
}
