import { getQuery } from '@shared/api/baseQueryTypes';
import { appStore } from '@shared/model/app_store/AppStore';

import { buildReportDeviceActionsListUrl } from './buildReportDeviceActionsListUrl';
import { fetchAllReportReferencePages } from './fetchAllReportReferencePages';
import { getEventTypeLabel } from './sobriety';

import type { Values } from '@shared/ui/search_multiple_select';

import { Formatters } from '@shared/utils/formatters';

import {
  isReportAnonymousUser,
  isReportRecordWithAnonymousUser,
} from './reportAnonymousUser';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

type ActionRecord = Record<string, unknown>;

function asActionRecord(record: unknown): ActionRecord | null {
  if (record == null || typeof record !== 'object' || Array.isArray(record)) return null;
  return record as ActionRecord;
}

/** Поле metadata «алкозамок» / device / device.id — не список действий. */
export function isDeviceActionDeviceAttribute(attribute: string): boolean {
  const attr = (attribute ?? '').trim();
  return attr === 'device' || attr === 'device.id' || attr.startsWith('device.');
}

/** Пользователь в device-actions: createdBy, userAction, user, … */
export function isDeviceActionUserAttribute(attribute: string): boolean {
  const attr = (attribute ?? '').trim().toLowerCase();
  return (
    attr === 'createdby' ||
    attr === 'user' ||
    attr === 'useraction' ||
    attr === 'userrecord' ||
    attr === 'lastmodifiedby' ||
    attr === 'initiator' ||
    attr === 'handler' ||
    attr.startsWith('createdby.') ||
    attr.startsWith('useraction.') ||
    attr.startsWith('userrecord.') ||
    attr.startsWith('user.')
  );
}

export function formatUserPersonLabel(person: ActionRecord): string {
  if (typeof person.fullName === 'string' && person.fullName.trim()) {
    return person.fullName.trim();
  }
  const parts = [person.surname, person.firstName, person.middleName]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  if (parts.length) return parts.join(' ');
  if (typeof person.email === 'string' && person.email.trim()) return person.email.trim();
  return person.id != null ? String(person.id) : '';
}

function readPersonObject(raw: unknown): ActionRecord | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as ActionRecord;
}

/** Пользователь по полю metadata (по умолчанию createdBy). */
function readUserForAttribute(action: ActionRecord, attribute: string): ActionRecord | null {
  const attr = (attribute ?? '').trim();
  const root = attr.includes('.') ? attr.split('.')[0] : attr;
  switch (root) {
    case 'createdBy':
      return (
        readPersonObject(action.createdBy) ??
        readPersonObject(action.userAction) ??
        readPersonObject(firstEvent(action)?.user)
      );
    case 'userAction':
      return readPersonObject(action.userAction);
    case 'userRecord':
      return readPersonObject(action.userRecord);
    case 'user':
      return readPersonObject(action.user) ?? readPersonObject(firstEvent(action)?.user);
    case 'lastModifiedBy':
      return readPersonObject(action.lastModifiedBy);
    case 'initiator':
      return readPersonObject(action.initiator);
    case 'handler':
      return readPersonObject(action.handler);
    default:
      return readPersonObject(action.createdBy) ?? readPersonObject(action.userAction);
  }
}

export function formatDeviceNameSerialLabel(device: ActionRecord): string {
  const name = typeof device.name === 'string' ? device.name.trim() : '';
  const serial =
    device.serialNumber != null && String(device.serialNumber).trim()
      ? String(device.serialNumber).trim()
      : '';
  if (name && serial) return `${name} (${serial})`;
  return name || serial || (device.id != null ? String(device.id) : '');
}

function readDeviceFromAction(action: ActionRecord): ActionRecord | null {
  const device = action.device;
  if (device == null || typeof device !== 'object' || Array.isArray(device)) return null;
  return device as ActionRecord;
}

function firstEvent(action: ActionRecord): ActionRecord | null {
  const events = action.events;
  if (!Array.isArray(events) || events.length === 0) return null;
  const ev = events[0];
  return ev != null && typeof ev === 'object' && !Array.isArray(ev) ? (ev as ActionRecord) : null;
}

function scalarFromUnknown(value: unknown): string | number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const o = value as ActionRecord;
    if (typeof o.fullName === 'string' && o.fullName.trim()) return o.fullName.trim();
    if (typeof o.label === 'string' && o.label.trim()) return o.label.trim();
    if (typeof o.name === 'string' && o.name.trim()) return o.name.trim();
    const fio = formatUserPersonLabel(o);
    if (fio && o.firstName != null) return fio;
    if (o.id != null && o.id !== '') return o.id as string | number;
  }
  return null;
}

function readNestedScalar(action: ActionRecord, path: string): string | number | null {
  const parts = path.split('.');
  let cur: unknown = action;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return null;
    cur = (cur as ActionRecord)[part];
  }
  return scalarFromUnknown(cur);
}

function collectEventTypeLabels(action: ActionRecord): string[] {
  const seen = new Set<string>();
  const add = (raw: unknown) => {
    const s = scalarFromUnknown(raw);
    if (s == null) return;
    const key = String(s);
    if (!seen.has(key)) seen.add(key);
  };

  add(action.eventsForFront);
  add(action.eventType);

  const ev0 = firstEvent(action);
  if (ev0) {
    add(ev0.eventsForFront);
    add(ev0.eventType);
  }

  const fromHelper = getEventTypeLabel(action);
  if (fromHelper.trim()) seen.add(fromHelper.trim());

  return Array.from(seen);
}

function collectEventsForFrontIds(action: ActionRecord): (string | number)[] {
  const seen = new Set<string>();
  const add = (raw: unknown) => {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return;
    const id = (raw as ActionRecord).id;
    if (id == null) return;
    seen.add(String(id));
  };

  add(action.eventsForFront);
  const ev0 = firstEvent(action);
  if (ev0) add(ev0.eventsForFront);

  return Array.from(seen).map((s) => (/^\d+$/.test(s) ? Number(s) : s));
}

/** Скалярные значения поля DeviceAction для фильтра (без [object Object]). */
export function readDeviceActionAttributeValues(record: unknown, attribute: string): (string | number)[] {
  const action = asActionRecord(record);
  if (!action) return [];

  const attr = (attribute ?? '').trim();
  if (!attr) return [];

  if (attr.includes('.')) {
    const scalar = readNestedScalar(action, attr);
    return scalar != null ? [scalar] : [];
  }

  switch (attr) {
    case 'id':
      return action.id != null ? [action.id as string | number] : [];
    case 'uuid':
      return typeof action.uuid === 'string' ? [action.uuid] : [];
    case 'type':
    case 'status':
      return typeof action[attr] === 'string' ? [action[attr] as string] : [];
    case 'timestamp':
    case 'occurredAt': {
      const raw =
        action.occurredAt ??
        action.timestamp ??
        action.startedAt ??
        firstEvent(action)?.timestamp;
      return raw != null && raw !== '' ? [String(raw)] : [];
    }
    case 'startedAt':
    case 'finishedAt':
    case 'createdAt':
    case 'lastModifiedAt':
      return action[attr] != null && action[attr] !== '' ? [String(action[attr])] : [];
    case 'isActive':
    case 'seen':
      return typeof action[attr] === 'boolean' ? [action[attr] ? 'true' : 'false'] : [];
    case 'name': {
      const device = action.device;
      if (device != null && typeof device === 'object' && !Array.isArray(device)) {
        const name = (device as ActionRecord).name;
        if (typeof name === 'string' && name.trim()) return [name.trim()];
      }
      return [];
    }
    case 'label':
    case 'eventType':
      return collectEventTypeLabels(action);
    case 'eventsForFront':
      return collectEventsForFrontIds(action);
    case 'device':
    case 'device.id': {
      const device = readDeviceFromAction(action);
      return device?.id != null ? [device.id as string | number] : [];
    }
    case 'device.name': {
      const device = readDeviceFromAction(action);
      const name = device?.name;
      return typeof name === 'string' && name.trim() ? [name.trim()] : [];
    }
    case 'device.serialNumber': {
      const device = readDeviceFromAction(action);
      const sn = device?.serialNumber;
      return sn != null && String(sn).trim() ? [String(sn).trim()] : [];
    }
    case 'createdBy':
    case 'user':
    case 'userAction':
    case 'userRecord':
    case 'lastModifiedBy':
    case 'initiator':
    case 'handler': {
      const person = readUserForAttribute(action, attr);
      return person?.id != null ? [person.id as string | number] : [];
    }
    case 'vehicle':
      return scalarFromUnknown(action.vehicle) != null ? [scalarFromUnknown(action.vehicle)!] : [];
    case 'vehicleRecord':
      return scalarFromUnknown(action.vehicleRecord) != null
        ? [scalarFromUnknown(action.vehicleRecord)!]
        : [];
    default: {
      const direct = scalarFromUnknown(action[attr]);
      return direct != null ? [direct] : [];
    }
  }
}

export function formatDeviceActionOptionLabel(
  record: unknown,
  attribute: string,
  value: string,
): string {
  const action = asActionRecord(record);
  if (!action) return value;

  const attr = (attribute ?? '').trim();

  if (attr === 'id') {
    const parts = [
      typeof action.type === 'string' ? action.type : '',
      getEventTypeLabel(action),
      String(action.id),
    ].filter(Boolean);
    return parts.join(' · ') || value;
  }

  if (isDeviceActionDeviceAttribute(attr)) {
    const device = readDeviceFromAction(action);
    if (device) return formatDeviceNameSerialLabel(device);
  }

  if (isDeviceActionUserAttribute(attr)) {
    const person = readUserForAttribute(action, attr);
    if (person) return formatUserPersonLabel(person);
  }

  if (attr === 'vehicleRecord' || attr.startsWith('vehicleRecord.')) {
    const vr = action.vehicleRecord;
    if (vr != null && typeof vr === 'object' && !Array.isArray(vr)) {
      return Formatters.carNameFormatter(vr as Parameters<typeof Formatters.carNameFormatter>[0], false, true, false) || value;
    }
  }

  if (attr === 'timestamp' || attr === 'occurredAt' || attr.endsWith('At')) {
    return value;
  }

  if (attr === 'eventsForFront') {
    const labels = collectEventTypeLabels(action);
    const hit = labels.find((l) => l === value);
    if (hit) return hit;
    const ev0 = firstEvent(action);
    const ef = ev0?.eventsForFront ?? action.eventsForFront;
    if (ef != null && typeof ef === 'object' && String((ef as ActionRecord).id) === value) {
      const label = (ef as ActionRecord).label;
      if (typeof label === 'string' && label.trim()) return label.trim();
    }
  }

  return value;
}

export async function fetchDeviceActionsForReport(searchQuery?: string): Promise<unknown[]> {
  const branchId = appStore.getState().selectedBranchState?.id;
  const pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE;

  const records = await fetchAllReportReferencePages(
    (page) =>
      getQuery<{ content?: unknown[]; totalElements?: number }>({
        url: buildReportDeviceActionsListUrl(pageSize, branchId, searchQuery, page),
      }),
    pageSize,
  );

  return records.filter((record) => !isReportRecordWithAnonymousUser(record));
}

/** Уникальные алкозамки из device-actions: value = device.id, label = BI8 (serial). */
export function buildDeviceActionDevicePickerOptions(records: unknown[]): Values {
  const seen = new Map<string, Values[number]>();

  for (const record of records) {
    const action = asActionRecord(record);
    if (!action) continue;
    const device = readDeviceFromAction(action);
    if (!device || device.id == null) continue;
    const key = String(device.id);
    if (seen.has(key)) continue;
    seen.set(key, {
      value: device.id as number | string,
      label: formatDeviceNameSerialLabel(device),
    });
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru', { numeric: true }),
  );
}

/** Уникальные пользователи (createdBy и др.): value = id, label = fullName. */
export function buildDeviceActionUserPickerOptions(
  records: unknown[],
  attribute = 'createdBy',
): Values {
  const seen = new Map<string, Values[number]>();

  for (const record of records) {
    const action = asActionRecord(record);
    if (!action) continue;
    const person = readUserForAttribute(action, attribute);
    if (!person || person.id == null || isReportAnonymousUser(person)) continue;
    const key = String(person.id);
    if (seen.has(key)) continue;
    seen.set(key, {
      value: person.id as number | string,
      label: formatUserPersonLabel(person),
    });
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  );
}

/** Опции «Значение» для DeviceAction по полю metadata. */
export function buildDeviceActionAttributeOptions(records: unknown[], attribute: string): Values {
  if (isDeviceActionDeviceAttribute(attribute)) {
    return buildDeviceActionDevicePickerOptions(records);
  }
  if (isDeviceActionUserAttribute(attribute)) {
    return buildDeviceActionUserPickerOptions(records, attribute);
  }
  const seen = new Map<string, Values[number]>();

  for (const record of records) {
    for (const raw of readDeviceActionAttributeValues(record, attribute)) {
      const value = String(raw);
      if (seen.has(value)) continue;
      seen.set(value, {
        value: raw,
        label: formatDeviceActionOptionLabel(record, attribute, value),
      });
    }
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru', { numeric: true }),
  );
}

/** Подпись действия по id (не алкозамок). */
export function formatDeviceActionEntityListLabel(record: unknown): string {
  const action = asActionRecord(record);
  if (!action) return '';
  const type = typeof action.type === 'string' ? action.type : '';
  const eventLabel = getEventTypeLabel(action);
  const head = eventLabel || type;
  return head || (action.id != null ? String(action.id) : '');
}
