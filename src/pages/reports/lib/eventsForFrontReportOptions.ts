import { EventsApi } from '@shared/api/baseQuerys';
import type { IEventType } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { findReferenceEntityFieldByAttribute } from './findReferenceEntityFieldByAttribute';
import type { ReportEntityMetadata, ReportFieldDefinition } from '../types/reportApiTypes';

/** Id 63 — «Слабый выдох», не показываем в справочнике типов событий (как в фильтре событий). */
export const REPORT_EVENT_TYPES_EXCLUDED_IDS = [63];

export function isEventsForFrontLevelAttribute(attribute: string): boolean {
  const attr = (attribute ?? '').trim();
  return attr === 'level' || attr === 'levelForFront' || attr === 'levelType';
}

export function isEventsForFrontTypeListAttribute(attribute: string): boolean {
  const attr = (attribute ?? '').trim();
  return attr === 'label' || attr === 'event' || isEventsForFrontLevelAttribute(attr);
}

/** Нужен GET …/event-types (как для «Название» / label). */
export function shouldUseEventsForFrontTypeListApi(
  referenceEntity: string,
  field: ReportFieldDefinition | undefined,
): boolean {
  if (!field) return false;
  const ref = (referenceEntity ?? '').trim();
  const attr = (field.fieldName ?? '').trim();
  if (!isEventsForFrontTypeListAttribute(attr)) return false;
  if (ref === 'EventsForFront') return true;
  if ((field.referenceEntity ?? '').trim() === 'EventsForFront') return true;
  return false;
}

/** Принудительно domainList для полей EventsForFront из event-types. */
export function shouldForceEventsForFrontDomainList(
  referenceEntity: string,
  field: ReportFieldDefinition | undefined,
): boolean {
  return shouldUseEventsForFrontTypeListApi(referenceEntity, field);
}

export type EventsForFrontValueFetchTarget = {
  referenceEntity: 'EventsForFront';
  field: ReportFieldDefinition;
};

/**
 * «Уровень» на DeviceAction часто без referenceEntity в metadata — лист берём из EventsForFront (levelForFront).
 */
export function resolveEventsForFrontLevelValueField(
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition | undefined {
  const eventsMeta = metadataByEntity.EventsForFront;
  if (!eventsMeta) return undefined;
  return (
    findReferenceEntityFieldByAttribute(eventsMeta, 'levelForFront') ??
    findReferenceEntityFieldByAttribute(eventsMeta, 'level') ??
    findReferenceEntityFieldByAttribute(eventsMeta, 'levelType')
  );
}

export function resolveNestedFilterValueFetchTarget(
  leafEntityName: string,
  field: ReportFieldDefinition,
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
): { referenceEntity: string; field: ReportFieldDefinition } {
  const entity = (leafEntityName ?? '').trim();
  const name = (field.fieldName ?? '').trim();

  if (shouldUseEventsForFrontTypeListApi(entity, field)) {
    return { referenceEntity: 'EventsForFront', field };
  }

  if (
    entity !== 'EventsForFront' &&
    isEventsForFrontLevelAttribute(name)
  ) {
    const levelField = resolveEventsForFrontLevelValueField(metadataByEntity);
    if (levelField) {
      return { referenceEntity: 'EventsForFront', field: levelField };
    }
  }

  return { referenceEntity: entity, field };
}

function unwrapEventTypesList(res: {
  data?: IEventType[] | { content?: IEventType[] } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): IEventType[] {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report event-types failed');
  }
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

/** GET api/v1/front-data/event-types?all.id.notIn=63&sort=label (+ match при поиске). */
export async function fetchEventTypesForReport(searchQuery: string): Promise<IEventType[]> {
  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
  const res = await EventsApi.getEventsTypeList(
    { filterOptions: { match } },
    REPORT_EVENT_TYPES_EXCLUDED_IDS,
    false,
    false,
  );
  return unwrapEventTypesList(res);
}

export function buildEventsForFrontLevelOptions(types: IEventType[]): Values {
  const seen = new Map<string, Values[number]>();

  for (const item of types) {
    const level = item.level;
    if (!level || level.id == null) continue;
    const idKey = String(level.id);
    const label = (level.label != null && String(level.label).trim() !== ''
      ? String(level.label).trim()
      : idKey);
    if (seen.has(idKey)) continue;
    seen.set(idKey, { value: level.id, label });
  }

  return Array.from(seen.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'ru', { sensitivity: 'base' }),
  );
}

/**
 * POST …/query: фильтр по уровню — id (как eventsForFront.event с кодом события), не label «Информация».
 * Путь без дублирования level.level из nested path.
 */
export function resolveEventsForFrontLevelFilterApiFieldName(
  primaryField: ReportFieldDefinition,
  nestedPath: string[],
): string | null {
  if (!nestedPath.some(isEventsForFrontLevelAttribute)) {
    return null;
  }
  const primaryName = (primaryField.fieldName ?? '').trim();
  if (primaryName === 'eventsForFront' || primaryName.endsWith('.eventsForFront')) {
    return 'eventsForFront.level.id';
  }
  return `${primaryName}.level.id`;
}

/** Опции «Значение» для label / event / level* из event-types. */
export async function fetchEventsForFrontFilterValueOptions(
  field: ReportFieldDefinition,
  searchQuery: string,
): Promise<Values> {
  const attr = (field.fieldName ?? '').trim();
  const types = await fetchEventTypesForReport(searchQuery);

  if (attr === 'label') {
    return types
      .filter((item) => item.label != null && item.label !== '')
      .map((item) => ({ value: String(item.label), label: String(item.label) }));
  }

  if (attr === 'event') {
    return types
      .filter((item) => typeof item.event === 'string' && item.event.trim() !== '')
      .map((item) => ({
        value: String(item.event).trim(),
        label: item.label ?? String(item.event),
      }));
  }

  if (isEventsForFrontLevelAttribute(attr)) {
    return buildEventsForFrontLevelOptions(types);
  }

  return types
    .filter((item) => item.label != null && item.label !== '')
    .map((item) => ({ value: String(item.label), label: String(item.label) }));
}
