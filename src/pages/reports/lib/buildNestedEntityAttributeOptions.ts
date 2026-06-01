import {
  buildDeviceActionAttributeOptions,
  formatDeviceActionEntityListLabel,
  formatDeviceActionOptionLabel,
  readDeviceActionAttributeValues,
} from './deviceActionReportOptions';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';

import type {
  IAlcolock,
  IAttachmentItems,
  ICar,
  IDeviceAction,
  IUser,
} from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { Formatters } from '@shared/utils/formatters';

import { isEntityIdAttribute } from './reportEntityIdAttribute';
import {
  formatReportVehicleCarLabel,
  isReportVehicleCarDisplayAttribute,
  readReportVehicleCarFilterValue,
} from './reportVehicleBindLabel';

const USER_GROUP_NAME_ATTR = 'groupMembership.group.name';

/** Названия ролей (групп) из groupMembership[].group.name. */
export function extractUserGroupNames(record: unknown): string[] {
  if (record == null || typeof record !== 'object') return [];
  const memberships = (record as Record<string, unknown>).groupMembership;
  if (!Array.isArray(memberships)) return [];

  const names: string[] = [];
  const seen = new Set<string>();
  for (const item of memberships) {
    if (item == null || typeof item !== 'object') continue;
    const group = (item as Record<string, unknown>).group;
    if (group == null || typeof group !== 'object') continue;
    const name = (group as Record<string, unknown>).name;
    if (name == null || name === '') continue;
    const s = String(name);
    if (seen.has(s)) continue;
    seen.add(s);
    names.push(s);
  }
  return names.sort((a, b) => a.localeCompare(b, 'ru'));
}

function readRecordAttribute(record: unknown, attribute: string): string | number | null | undefined {
  if (record == null || typeof record !== 'object') return null;
  if (attribute === USER_GROUP_NAME_ATTR) {
    return null;
  }
  if (attribute === 'id' && 'id' in record) {
    return (record as { id: unknown }).id as string | number;
  }
  if (isReportVehicleCarDisplayAttribute(attribute)) {
    return readReportVehicleCarFilterValue(record);
  }
  if (attribute.includes('.')) {
    const parts = attribute.split('.');
    let cur: unknown = record;
    for (const part of parts) {
      if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return null;
      cur = (cur as Record<string, unknown>)[part];
    }
    if (cur == null || cur === '') return null;
    if (typeof cur === 'boolean') return cur ? 'true' : 'false';
    if (typeof cur === 'string' || typeof cur === 'number') return cur;
    if (typeof cur === 'object' && !Array.isArray(cur)) {
      const o = cur as Record<string, unknown>;
      if (o.id != null && (o.manufacturer != null || o.model != null || o.registrationNumber != null)) {
        return o.id as string | number;
      }
    }
    return String(cur);
  }
  const value = (record as Record<string, unknown>)[attribute];
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>;
    if (typeof o.label === 'string' && o.label.trim()) return o.label.trim();
    if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
    if (o.id != null && o.id !== '') return o.id as string | number;
  }
  return null;
}

/** Одно или несколько значений свойства (роли пользователя — по одной на группу). */
function readRecordAttributeValues(
  record: unknown,
  attribute: string,
  referenceEntity?: string,
): (string | number)[] {
  if (referenceEntity === 'DeviceAction') {
    return readDeviceActionAttributeValues(record, attribute);
  }
  if (attribute === USER_GROUP_NAME_ATTR) {
    return extractUserGroupNames(record);
  }
  const single = readRecordAttribute(record, attribute);
  return single != null ? [single] : [];
}

function resolveOptionLabel(
  referenceEntity: string,
  attribute: string,
  value: string,
  record: unknown,
  labelMaps?: ReportVehicleLabelMaps,
): string {
  if (isEntityIdAttribute(attribute)) {
    return value;
  }
  if (isReportVehicleCarDisplayAttribute(attribute)) {
    return formatReportVehicleCarLabel(
      record != null && typeof record === 'object' ? record : undefined,
      value,
    );
  }
  if (referenceEntity === 'Vehicle') {
    if (attribute === 'type') return labelMaps?.types[value] ?? value;
    if (attribute === 'color') return labelMaps?.colors[value] ?? value;
  }
  if (referenceEntity === 'User' && attribute === USER_GROUP_NAME_ATTR) {
    return value;
  }
  if (referenceEntity === 'User' && attribute === 'fullName' && record && typeof record === 'object') {
    const fullName = (record as Record<string, unknown>).fullName;
    if (typeof fullName === 'string' && fullName.trim()) return fullName;
    return Formatters.nameFormatter(record as IUser, false) || value;
  }
  if (referenceEntity === 'BranchOffice') {
    if (
      (attribute === 'createdBy.id' ||
        attribute === 'createdBy.fullName' ||
        attribute === 'lastModifiedBy.id' ||
        attribute === 'lastModifiedBy.fullName') &&
      record &&
      typeof record === 'object'
    ) {
      const root = attribute.split('.')[0];
      const person = (record as Record<string, unknown>)[root];
      if (person != null && typeof person === 'object' && !Array.isArray(person)) {
        const p = person as Record<string, unknown>;
        if (typeof p.fullName === 'string' && p.fullName.trim()) return p.fullName.trim();
        const parts = [p.surname, p.firstName, p.middleName]
          .map((x) => (typeof x === 'string' ? x.trim() : ''))
          .filter(Boolean);
        if (parts.length) return parts.join(' ');
      }
    }
    if (attribute === 'parentOffice.id' && record && typeof record === 'object') {
      const parent = (record as Record<string, unknown>).parentOffice;
      if (parent != null && typeof parent === 'object' && !Array.isArray(parent)) {
        const name = (parent as { name?: string }).name;
        if (typeof name === 'string' && name.trim()) return name.trim();
      }
    }
  }
  if (referenceEntity === 'DeviceAction') {
    return formatDeviceActionOptionLabel(record, attribute, value);
  }
  return value;
}

function dictionaryToValues(map: Record<string, string>): Values {
  return Object.entries(map)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'));
}

/** Опции для мультивыбора «Значения» по выбранному свойству сущности. */
export function buildNestedEntityAttributeOptions(
  records: unknown[],
  referenceEntity: string,
  attribute: string,
  labelMaps?: ReportVehicleLabelMaps,
): Values {
  if (referenceEntity === 'Vehicle' && attribute === 'color' && labelMaps?.colors) {
    return dictionaryToValues(labelMaps.colors);
  }
  if (referenceEntity === 'Vehicle' && attribute === 'type' && labelMaps?.types) {
    return dictionaryToValues(labelMaps.types);
  }
  if (referenceEntity === 'DeviceAction') {
    return buildDeviceActionAttributeOptions(records, attribute);
  }

  const seen = new Map<string, Values[number]>();

  for (const record of records) {
    for (const raw of readRecordAttributeValues(record, attribute, referenceEntity)) {
      const value = String(raw);
      if (seen.has(value)) continue;
      seen.set(value, {
        value,
        label: resolveOptionLabel(referenceEntity, attribute, value, record, labelMaps),
      });
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru', { numeric: true }),
  );
}

/** Подписи чипов выбранных конечных значений. */
export function enrichNestedEntityFilterValues(
  referenceEntity: string,
  attribute: string,
  values: Values,
  records: unknown[],
  labelMaps?: ReportVehicleLabelMaps,
): Values {
  if (!attribute || !values.length) return values;
  const byValue = new Map<string, unknown>();
  for (const r of records) {
    for (const raw of readRecordAttributeValues(r, attribute, referenceEntity)) {
      byValue.set(String(raw), r);
    }
  }
  return values.map((item) => {
    const value = String(item.value);
    const record = byValue.get(value);
    return {
      value,
      label: resolveOptionLabel(referenceEntity, attribute, value, record, labelMaps),
    };
  });
}

/** Список по полю id — value и label совпадают с числовым идентификатором. */
export function recordsToIdOnlyListValues(records: unknown[]): Values {
  return records
    .map((r) => {
      const id = readRecordAttribute(r, 'id');
      if (id == null) return null;
      return { value: id, label: String(id) };
    })
    .filter((x): x is Values[number] => x != null);
}

function formatVehicleBindListLabel(item: IAttachmentItems): string {
  return formatReportVehicleCarLabel(item, String(item.id));
}

/** Список сущностей (первый контрол) — id + подпись из записи API. */
export function recordsToEntityListValues(referenceEntity: string, records: unknown[]): Values {
  if (referenceEntity === 'Vehicle') {
    return (records as ICar[]).map((car) => ({
      value: car.id,
      label: Formatters.carNameFormatter(car, false, true, false),
    }));
  }
  if (referenceEntity === 'MonitoringDevice') {
    return (records as IAlcolock[]).map((d) => {
      const name = (d.name ?? '').trim();
      const serial = d.serialNumber != null ? String(d.serialNumber).trim() : '';
      const label =
        name && serial ? `${name} (${serial})` : name || serial || String(d.id);
      return { value: d.id, label };
    });
  }
  if (referenceEntity === 'User') {
    return (records as IUser[]).map((u) => ({
      value: u.id,
      label: Formatters.nameFormatter(u, false) || String(u.id),
    }));
  }
  if (referenceEntity === 'DeviceAction') {
    return records
      .map((r) => {
        const id = readDeviceActionAttributeValues(r, 'id')[0];
        if (id == null) return null;
        return { value: id, label: formatDeviceActionEntityListLabel(r) };
      })
      .filter((x): x is Values[number] => x != null);
  }
  if (referenceEntity === 'BranchOffice') {
    return (records as { id?: number | string; name?: string }[]).map((office) => ({
      value: office.id as number | string,
      label: (office.name ?? '').trim() || String(office.id),
    }));
  }
  if (referenceEntity === 'VehicleBind') {
    return (records as IAttachmentItems[]).map((item) => ({
      value: item.id,
      label: formatVehicleBindListLabel(item),
    }));
  }
  if (referenceEntity === 'AutoServiceHistory') {
    return (records as IDeviceAction[]).map((item) => {
      const date = item.createdAt ? Formatters.formatISODate(item.createdAt) : '';
      const type =
        typeof item.eventType === 'string' ? item.eventType : item.eventType?.label;
      const device = Formatters.alcolocksFormatter(item.device);
      const label = [date, type, device].filter(Boolean).join(' · ') || String(item.id);
      return { value: item.id, label };
    });
  }
  return records
    .map((r) => {
      const id = readRecordAttribute(r, 'id');
      if (id == null) return null;
      const label =
        readRecordAttribute(r, 'name') ??
        readRecordAttribute(r, 'label') ??
        String(id);
      return { value: id, label: String(label) };
    })
    .filter((x): x is Values[number] => x != null);
}
