import dayjs from 'dayjs';

import { isReportEmptyValue } from './reportDisplayValue';

export type EntityLabel = {
  key: string;
  label: string;
  detail?: string;
};

export type RowFacts = {
  eventType: string;
  branch: string;
  user: EntityLabel | null;
  vehicle: EntityLabel | null;
  device: EntityLabel | null;
  day: string;
};

export type DetectedChartDimensions = {
  eventType: boolean;
  date: boolean;
  user: boolean;
  vehicle: boolean;
  device: boolean;
  branch: boolean;
};

const EVENT_TYPE_HINTS = ['eventsforfront', 'eventtypelabel', 'eventtype'];
const DATE_HINTS = ['occurred', 'timestamp', 'createdat', 'startedat', 'lastmodifiedat'];
const USER_PREFIXES = ['user', 'driver', 'initiator', 'handler', 'createdby', 'lastmodifiedby'];
const VEHICLE_PREFIXES = ['vehicle', 'car'];
const DEVICE_PREFIXES = ['device', 'monitoringdevice', 'alcolock'];

function readScalar(value: unknown): string {
  if (isReportEmptyValue(value)) return '';
  if (typeof value === 'object' && value != null) {
    const record = value as Record<string, unknown>;
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    if (typeof record.fullName === 'string' && record.fullName.trim()) return record.fullName.trim();
    const fio = [record.surname, record.firstName, record.middleName].filter(Boolean).join(' ').trim();
    if (fio) return fio;
    if (record.email) return String(record.email).trim();
    if (record.registrationNumber) return String(record.registrationNumber).trim();
    if (record.serialNumber) return String(record.serialNumber).trim();
  }
  return String(value).trim();
}

function readRowField(row: Record<string, unknown>, field: string): string {
  if (field in row) return readScalar(row[field]);
  const lower = field.toLowerCase();
  const match = Object.keys(row).find((key) => key.toLowerCase() === lower);
  return match ? readScalar(row[match]) : '';
}

function readPrefixedFields(row: Record<string, unknown>, prefix: string): Record<string, string> {
  const result: Record<string, string> = {};
  const normalized = `${prefix.toLowerCase()}.`;
  for (const [key, value] of Object.entries(row)) {
    const lower = key.toLowerCase();
    if (!lower.startsWith(normalized)) continue;
    const suffix = key.slice(key.indexOf('.') + 1);
    const text = readScalar(value);
    if (text) result[suffix] = text;
  }
  return result;
}

function hasPrefixedFields(row: Record<string, unknown>, prefixes: string[]): boolean {
  const keys = Object.keys(row).map((key) => key.toLowerCase());
  return prefixes.some((prefix) => keys.some((key) => key.startsWith(`${prefix}.`)));
}

function keyLooksLikeEventType(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.includes('eventsforfront') && (lower.endsWith('.label') || lower.endsWith('.event'))) {
    return true;
  }
  if (lower.endsWith('.label') && (lower.includes('event') || lower.includes('action'))) return true;
  return EVENT_TYPE_HINTS.some((hint) => lower.includes(hint));
}

function keyLooksLikeDate(key: string): boolean {
  const lower = key.toLowerCase();
  return DATE_HINTS.some((hint) => lower.includes(hint));
}

function pickBestKey(keys: string[], matcher: (key: string) => boolean): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const key of keys) {
    if (!matcher(key)) continue;
    const lower = key.toLowerCase();
    let score = 10;
    if (lower.includes('eventsforfront')) score += 40;
    if (lower.endsWith('.label')) score += 20;
    if (lower.includes('occurred') || lower.includes('timestamp')) score += 30;
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return best;
}

function buildUserLabel(row: Record<string, unknown>): EntityLabel | null {
  for (const prefix of USER_PREFIXES) {
    const fields = readPrefixedFields(row, prefix);
    if (!Object.keys(fields).length) continue;

    const fio = [fields.surname, fields.firstName, fields.middleName].filter(Boolean).join(' ').trim();
    const email = fields.email ?? '';
    const fullName = fields.fullName ?? '';
    const id = fields.id ?? fields.login ?? '';
    const baseLabel = fio || fullName || email || (id ? `User #${id}` : '');
    if (!baseLabel) continue;

    const key = email || id || fio || baseLabel;
    const label = fio && email ? `${fio} (${email})` : baseLabel;
    return {
      key,
      label,
      detail: fio && email ? email : undefined,
    };
  }
  return null;
}

function buildVehicleLabel(row: Record<string, unknown>): EntityLabel | null {
  for (const prefix of VEHICLE_PREFIXES) {
    const fields = readPrefixedFields(row, prefix);
    if (!Object.keys(fields).length) continue;

    const reg = fields.registrationNumber ?? fields.stateNumber ?? '';
    const make = [fields.manufacturer, fields.model].filter(Boolean).join(' ').trim();
    if (!reg && !make) continue;

    const label = reg ? `${make || '—'} (${reg})` : make;
    return { key: reg || label, label };
  }
  return null;
}

function buildDeviceLabel(row: Record<string, unknown>): EntityLabel | null {
  for (const prefix of DEVICE_PREFIXES) {
    const fields = readPrefixedFields(row, prefix);
    if (!Object.keys(fields).length) continue;

    const name = fields.name ?? '';
    const serial = fields.serialNumber ?? '';
    if (!name && !serial) continue;

    const label = [name, serial].filter(Boolean).join(' / ');
    return { key: serial || name || label, label };
  }
  return null;
}

function readBranchLabel(row: Record<string, unknown>): string {
  const direct = readRowField(row, 'branch.name') || readRowField(row, 'office.name');
  if (direct) return direct;

  const branchFields = readPrefixedFields(row, 'branch');
  if (branchFields.name) return branchFields.name;

  const officeFields = readPrefixedFields(row, 'office');
  return officeFields.name ?? '';
}

function readDayLabel(row: Record<string, unknown>, dateKey: string | null): string {
  if (!dateKey) return '';
  const raw = readRowField(row, dateKey);
  if (!raw) return '';
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
}

export function detectChartDimensions(
  content: Record<string, unknown>[],
): DetectedChartDimensions {
  const keys = collectContentKeys(content);
  const sample = content[0] ?? {};

  return {
    eventType: keys.some(keyLooksLikeEventType) || Boolean(readRowField(sample, 'label')),
    date: keys.some(keyLooksLikeDate),
    user: hasPrefixedFields(sample, USER_PREFIXES),
    vehicle: hasPrefixedFields(sample, VEHICLE_PREFIXES),
    device: hasPrefixedFields(sample, DEVICE_PREFIXES),
    branch:
      keys.some((key) => {
        const lower = key.toLowerCase();
        return lower.startsWith('branch.') || lower.startsWith('office.') || lower === 'branch.name';
      }) || Boolean(readBranchLabel(sample)),
  };
}

function collectContentKeys(content: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const row of content) {
    for (const key of Object.keys(row)) keys.add(key);
  }
  return Array.from(keys);
}

export function extractRowFacts(
  row: Record<string, unknown>,
  keys: string[],
): RowFacts | null {
  const eventTypeKey = pickBestKey(keys, keyLooksLikeEventType);
  const dateKey = pickBestKey(keys, keyLooksLikeDate);

  const facts: RowFacts = {
    eventType: eventTypeKey ? readRowField(row, eventTypeKey) : readRowField(row, 'label'),
    branch: readBranchLabel(row),
    user: buildUserLabel(row),
    vehicle: buildVehicleLabel(row),
    device: buildDeviceLabel(row),
    day: readDayLabel(row, dateKey),
  };

  const hasData = Boolean(
    facts.eventType ||
      facts.branch ||
      facts.user ||
      facts.vehicle ||
      facts.device ||
      facts.day,
  );
  return hasData ? facts : null;
}
