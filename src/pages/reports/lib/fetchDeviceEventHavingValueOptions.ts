import { EventsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { normalizeReportBranchIds } from './buildReportBranchQueryParams';
import {
  DEVICE_EVENT_REPORT_ENTITY,
  isDeviceEventReportEntity,
} from './fetchDeviceEventCoordinatePairsForReport';
import { isReportRecordWithAnonymousUser } from './reportAnonymousUser';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

type EventRecord = Record<string, unknown>;

function asRecord(raw: unknown): EventRecord | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as EventRecord;
}

/** Сопоставление путей metadata отчёта с полями ответа api/device-events. */
export function mapDeviceEventReportFieldPathToApiPath(fieldPath: string): string {
  const path = (fieldPath ?? '').trim();
  if (!path) return path;

  if (path === 'eventsForFront.event' || path === 'eventsForFront') {
    return 'eventsForFront.id';
  }

  const aliasRoots: Array<[string, string]> = [
    ['user.', 'userRecord.'],
    ['device.', 'deviceRecord.'],
    ['vehicle.', 'vehicleRecord.'],
  ];
  for (const [from, to] of aliasRoots) {
    if (path.startsWith(from)) {
      return `${to}${path.slice(from.length)}`;
    }
  }

  if (path === 'user') return 'userRecord';
  if (path === 'device') return 'deviceRecord';
  if (path === 'vehicle') return 'vehicleRecord';

  return path;
}

function readNested(raw: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean);
  let cur: unknown = raw;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) return null;
    cur = (cur as EventRecord)[part];
  }
  return cur;
}

function formatPersonLabel(person: EventRecord): string {
  if (typeof person.fullName === 'string' && person.fullName.trim()) {
    return person.fullName.trim();
  }
  const fio = [person.surname, person.firstName, person.middleName]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');
  if (fio) return fio;
  if (typeof person.email === 'string' && person.email.trim()) return person.email.trim();
  return person.id != null ? String(person.id) : '';
}

function formatDeviceLabel(device: EventRecord): string {
  const name = typeof device.name === 'string' ? device.name.trim() : '';
  const serial =
    device.serialNumber != null && String(device.serialNumber).trim()
      ? String(device.serialNumber).trim()
      : '';
  if (name && serial) return `${name} (${serial})`;
  return name || serial || (device.id != null ? String(device.id) : '');
}

function formatVehicleLabel(vehicle: EventRecord): string {
  return (
    Formatters.carNameFormatter(
      vehicle as unknown as Parameters<typeof Formatters.carNameFormatter>[0],
      false,
      true,
      false,
    ) || (vehicle.id != null ? String(vehicle.id) : '')
  );
}

function scalarToOption(
  value: unknown,
  context: { apiPath: string; record: EventRecord },
): Values[number] | null {
  if (value == null || value === '') return null;

  if (typeof value === 'boolean') {
    const s = value ? 'true' : 'false';
    return { value: s, label: s };
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return { value, label: String(value) };
  }

  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const obj = value as EventRecord;

  if (context.apiPath === 'eventsForFront' || context.apiPath === 'eventsForFront.id') {
    if (obj.id == null) return null;
    const label =
      typeof obj.label === 'string' && obj.label.trim() ? obj.label.trim() : String(obj.id);
    return { value: obj.id as string | number, label };
  }

  if (context.apiPath.startsWith('userRecord') || context.apiPath === 'user') {
    const label = formatPersonLabel(obj);
    if (obj.id != null) return { value: obj.id as string | number, label: label || String(obj.id) };
    if (label) return { value: label, label };
    return null;
  }

  if (context.apiPath.startsWith('deviceRecord') || context.apiPath === 'device') {
    const label = formatDeviceLabel(obj);
    if (obj.id != null) return { value: obj.id as string | number, label: label || String(obj.id) };
    if (label) return { value: label, label };
    return null;
  }

  if (context.apiPath.startsWith('vehicleRecord') || context.apiPath === 'vehicle') {
    const label = formatVehicleLabel(obj);
    if (obj.id != null) return { value: obj.id as string | number, label: label || String(obj.id) };
    if (label) return { value: label, label };
    return null;
  }

  if (typeof obj.label === 'string' && obj.label.trim()) {
    const label = obj.label.trim();
    return { value: obj.id != null ? (obj.id as string | number) : label, label };
  }
  if (typeof obj.name === 'string' && obj.name.trim()) {
    const label = obj.name.trim();
    return { value: obj.id != null ? (obj.id as string | number) : label, label };
  }
  if (obj.id != null && obj.id !== '') {
    return { value: obj.id as string | number, label: String(obj.id) };
  }
  return null;
}

function extractOptionFromEvent(
  record: EventRecord,
  reportFieldPath: string,
): Values[number] | null {
  const apiPath = mapDeviceEventReportFieldPathToApiPath(reportFieldPath);
  if (!apiPath) return null;

  // Для id типа события берём объект целиком — нужна подпись label.
  if (apiPath === 'eventsForFront.id') {
    const ef = readNested(record, 'eventsForFront');
    return scalarToOption(ef, { apiPath, record });
  }

  if (apiPath === 'eventsForFront.level.id') {
    const level = readNested(record, 'eventsForFront.level');
    const levelRec = asRecord(level);
    if (!levelRec || levelRec.id == null) return null;
    const label =
      typeof levelRec.label === 'string' && levelRec.label.trim()
        ? levelRec.label.trim()
        : String(levelRec.id);
    return { value: levelRec.id as string | number, label };
  }

  const raw = readNested(record, apiPath);
  if (raw == null || raw === '') {
    // fallback: device / user / vehicle без Record-суффикса
    if (apiPath.startsWith('deviceRecord.')) {
      const alt = readNested(record, `device.${apiPath.slice('deviceRecord.'.length)}`);
      return scalarToOption(alt, { apiPath, record });
    }
    if (apiPath.startsWith('userRecord.')) {
      const alt = readNested(record, `user.${apiPath.slice('userRecord.'.length)}`);
      return scalarToOption(alt, { apiPath, record });
    }
    if (apiPath.startsWith('vehicleRecord.')) {
      const alt = readNested(record, `vehicle.${apiPath.slice('vehicleRecord.'.length)}`);
      return scalarToOption(alt, { apiPath, record });
    }
    return null;
  }

  return scalarToOption(raw, { apiPath, record });
}

/** Уникальные опции «Значения» having из уже загруженных device-events. */
export function buildDeviceEventHavingValueOptions(
  events: unknown[],
  reportFieldPath: string,
  searchQuery = '',
): Values {
  const path = (reportFieldPath ?? '').trim();
  if (!path || !events.length) return [];

  const match = Formatters.removeExtraSpaces(searchQuery ?? '').toLowerCase();
  const seen = new Map<string, Values[number]>();

  for (const item of events) {
    const record = asRecord(item);
    if (!record || isReportRecordWithAnonymousUser(record)) continue;
    const option = extractOptionFromEvent(record, path);
    if (!option) continue;
    const key = String(option.value);
    if (seen.has(key)) continue;
    if (
      match &&
      !String(option.label).toLowerCase().includes(match) &&
      !key.toLowerCase().includes(match)
    ) {
      continue;
    }
    seen.set(key, option);
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru'),
  );
}

export type FetchDeviceEventsForHavingParams = {
  entityName: string;
  branchIds?: Array<number | string | null | undefined>;
  searchQuery?: string;
  signal?: AbortSignal;
};

/**
 * Страница событий для справочников having.Values.
 * GET api/device-events?page=0&size=25&all.branch.id.in=…&sort=timestamp,DESC&sort=id,DESC
 */
export async function fetchDeviceEventsForHavingOptions(
  params: FetchDeviceEventsForHavingParams,
): Promise<unknown[]> {
  const entityName = (params.entityName ?? '').trim();
  if (!isDeviceEventReportEntity(entityName)) return [];

  const selectedBranchId = appStore.getState().selectedBranchState?.id;
  const branchIds = normalizeReportBranchIds(
    params.branchIds?.length
      ? params.branchIds
      : selectedBranchId != null
        ? [selectedBranchId]
        : [],
  );

  const multiBranchQuery =
    branchIds.length > 1 ? `&all.branch.id.in=${branchIds.join(',')}` : undefined;

  const res = await EventsApi.getList(
    {
      page: 0,
      limit: REPORT_REFERENCE_LIST_PAGE_SIZE,
      searchQuery: params.searchQuery ?? '',
      filterOptions:
        branchIds.length === 1
          ? { branchId: branchIds[0] }
          : selectedBranchId != null && !branchIds.length
            ? { branchId: selectedBranchId }
            : {},
      ...(multiBranchQuery ? { query: multiBranchQuery } : {}),
    },
    params.signal ? { signal: params.signal } : undefined,
  );

  if (res.isError) {
    throw new Error(res.message || res.detail || 'device-events request failed');
  }

  return Array.isArray(res.data?.content) ? res.data.content : [];
}

export type FetchDeviceEventHavingValueOptionsParams = {
  entityName: string;
  fieldPath: string;
  field?: ReportFieldDefinition | null;
  searchQuery?: string;
  branchIds?: Array<number | string | null | undefined>;
  signal?: AbortSignal;
};

/** Справочник для одного поля having.Values (один запрос device-events). */
export async function fetchDeviceEventHavingValueOptions(
  params: FetchDeviceEventHavingValueOptionsParams,
): Promise<Values> {
  const fieldPath = (params.fieldPath ?? '').trim();
  if (!fieldPath) return [];
  const content = await fetchDeviceEventsForHavingOptions(params);
  return buildDeviceEventHavingValueOptions(content, fieldPath, params.searchQuery ?? '');
}

export { DEVICE_EVENT_REPORT_ENTITY, isDeviceEventReportEntity };
