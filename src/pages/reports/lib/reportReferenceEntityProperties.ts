import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportEntityMetadata } from '../types/reportApiTypes';

export type ReportReferenceEntityProperty = {
  key: string;
  labelKey: string;
};

/**
 * Устаревший статический список — только fallback, пока не загрузилась metadata.
 * @see buildReferenceEntityPropertyOptions
 */
export const REPORT_REFERENCE_ENTITY_PROPERTIES: Record<string, ReportReferenceEntityProperty[]> = {
  MonitoringDevice: [
    { key: 'id', labelKey: 'reports.nestedProp.id' },
    { key: 'name', labelKey: 'reports.nestedProp.name' },
    { key: 'serialNumber', labelKey: 'reports.nestedProp.serialNumber' },
    { key: 'vehicleBind', labelKey: 'reports.nestedProp.vehicleBind' },
    { key: 'mode', labelKey: 'reports.nestedProp.mode' },
    { key: 'isActive', labelKey: 'reports.nestedProp.activity' },
    { key: 'createdAt', labelKey: 'reports.nestedProp.createdAt' },
    { key: 'lastModifiedAt', labelKey: 'reports.nestedProp.lastModifiedAt' },
  ],
  Vehicle: [
    { key: 'id', labelKey: 'reports.vehicleId' },
    { key: 'registrationNumber', labelKey: 'form.stateNumber' },
    { key: 'manufacturer', labelKey: 'form.make' },
    { key: 'model', labelKey: 'form.model' },
    { key: 'year', labelKey: 'form.yearOfManufacture' },
    { key: 'vin', labelKey: 'reports.vehicleVin' },
    { key: 'type', labelKey: 'form.type' },
    { key: 'color', labelKey: 'form.color' },
    { key: 'isActive', labelKey: 'reports.nestedProp.activity' },
    { key: 'createdAt', labelKey: 'reports.nestedProp.createdAt' },
    { key: 'lastModifiedAt', labelKey: 'reports.nestedProp.lastModifiedAt' },
  ],
  User: [
    { key: 'id', labelKey: 'reports.nestedProp.id' },
    { key: 'fullName', labelKey: 'reports.nestedProp.fullName' },
    { key: 'login', labelKey: 'form.login' },
    { key: 'surname', labelKey: 'form.surname' },
    { key: 'firstName', labelKey: 'form.firstName' },
    { key: 'middleName', labelKey: 'form.middleName' },
    { key: 'email', labelKey: 'form.email' },
    { key: 'phone', labelKey: 'reports.nestedProp.phone' },
    { key: 'groupMembership.group.name', labelKey: 'reports.nestedProp.groupRole' },
    { key: 'isActive', labelKey: 'reports.nestedProp.activity' },
    { key: 'createdAt', labelKey: 'reports.nestedProp.createdAt' },
    { key: 'lastModifiedAt', labelKey: 'reports.nestedProp.lastModifiedAt' },
  ],
  DeviceAction: [
    { key: 'id', labelKey: 'reports.nestedProp.id' },
    { key: 'type', labelKey: 'reports.nestedProp.type' },
    { key: 'status', labelKey: 'reports.nestedProp.status' },
    { key: 'occurredAt', labelKey: 'reports.nestedProp.timestamp' },
    { key: 'startedAt', labelKey: 'reports.nestedProp.timestamp' },
    { key: 'finishedAt', labelKey: 'reports.nestedProp.timestamp' },
    { key: 'label', labelKey: 'reports.nestedProp.eventTypeLabel' },
    { key: 'eventsForFront', labelKey: 'reports.nestedProp.eventTypeLabel' },
    { key: 'device.name', labelKey: 'reports.nestedProp.name' },
    { key: 'device.serialNumber', labelKey: 'reports.nestedProp.serialNumber' },
    { key: 'vehicleRecord.registrationNumber', labelKey: 'form.stateNumber' },
    { key: 'isActive', labelKey: 'reports.nestedProp.activity' },
  ],
  EventsForFront: [
    { key: 'id', labelKey: 'reports.nestedProp.id' },
    { key: 'label', labelKey: 'reports.nestedProp.eventTypeLabel' },
  ],
  BranchOffice: [
    { key: 'id', labelKey: 'reports.nestedProp.id' },
    { key: 'name', labelKey: 'reports.nestedProp.name' },
  ],
};

export function getReferenceEntityProperties(referenceEntity: string): ReportReferenceEntityProperty[] {
  return REPORT_REFERENCE_ENTITY_PROPERTIES[referenceEntity] ?? [{ key: 'id', labelKey: 'reports.nestedProp.id' }];
}

/** «Параметр сущности» — из GET …/reports/{entity}/metadata; fallback — статический список до загрузки. */
export function buildReferenceEntityPropertyOptions(
  referenceEntity: string,
  tableMetadata: ReportEntityMetadata | null | undefined,
  t: TFunction,
): Values {
  const fromApi = (tableMetadata?.fields ?? []).filter((f) => f.filterable);
  if (fromApi.length > 0) {
    return fromApi
      .map((f) => ({
        value: f.fieldName,
        label: (f.label ?? '').trim() || f.fieldName,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }
  return getReferenceEntityProperties(referenceEntity).map((prop) => ({
    value: prop.key,
    label: t(prop.labelKey),
  }));
}
