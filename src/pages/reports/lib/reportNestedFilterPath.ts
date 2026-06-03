import { findReferenceEntityFieldByAttribute } from './findReferenceEntityFieldByAttribute';
import {
  isEventsForFrontLevelAttribute,
  resolveEventsForFrontLevelValueField,
} from './eventsForFrontReportOptions';
import i18n from 'i18next';

import {
  buildSyntheticCoordinatesFilterField,
  isReportCoordinatesCompositePropertyFieldName,
} from './reportCoordinateComposite';
import {
  buildSyntheticCompositeDomainListField,
  getReportCompositeEntityLabelKey,
  parseCompositePropertyFieldName,
  type ReportCompositeKind,
} from './reportEntityCompositeFields';
import { isReportLeafDomainListEntity } from './reportLeafEntityListApi';
import { resolveNestedEntityFilterFieldName } from './resolveNestedEntityFilterFieldName';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportNestedEntityFilterState,
} from '../types/reportApiTypes';

export function normalizeNestedFilterPath(state: ReportNestedEntityFilterState): string[] {
  if (state.path?.length) {
    return [...state.path];
  }
  const legacy = state.attribute?.trim();
  return legacy ? [legacy] : [];
}

export function findFieldInMetadata(
  metadata: ReportEntityMetadata | null | undefined,
  fieldName: string,
): ReportFieldDefinition | undefined {
  if (isReportCoordinatesCompositePropertyFieldName(fieldName)) {
    const latField = findReferenceEntityFieldByAttribute(metadata, 'latitude');
    return buildSyntheticCoordinatesFilterField(latField);
  }
  const compositeKind = parseCompositePropertyFieldName(fieldName);
  if (compositeKind && compositeKind !== 'Coordinates') {
    return buildSyntheticCompositeDomainListField(compositeKind, metadata);
  }
  return findReferenceEntityFieldByAttribute(metadata, fieldName);
}

/** Поле, по которому вводится значение фильтра (последний шаг path). */
export function resolveNestedFilterLeafField(
  rootMetadata: ReportEntityMetadata | null | undefined,
  path: string[],
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition | undefined {
  if (!path.length) return undefined;

  let metadata = rootMetadata;
  for (let i = 0; i < path.length - 1; i += 1) {
    const field = findFieldInMetadata(metadata, path[i]);
    const ref = field?.referenceEntity?.trim();
    if (!ref) return undefined;
    metadata = metadataByEntity[ref] ?? null;
  }

  return findFieldInMetadata(metadata, path[path.length - 1]);
}

/** Все referenceEntity по цепочке path (для предзагрузки metadata). */
export function collectNestedFilterMetadataEntities(
  rootMetadata: ReportEntityMetadata | null | undefined,
  path: string[],
): string[] {
  const refs: string[] = [];
  let metadata = rootMetadata;

  for (let i = 0; i < path.length; i += 1) {
    const field = findFieldInMetadata(metadata, path[i]);
    const ref = field?.referenceEntity?.trim();
    if (!ref) break;
    refs.push(ref);
    metadata = null;
  }

  if (path.some((step) => isEventsForFrontLevelAttribute(step)) && !refs.includes('EventsForFront')) {
    refs.push('EventsForFront');
  }

  return refs;
}

/** Следующий referenceEntity после выбранных полей (нужен ещё один «Параметр сущности»). */
export function resolveNestedFilterPendingReferenceEntity(
  rootMetadata: ReportEntityMetadata | null | undefined,
  path: string[],
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
): string | null {
  if (!path.length) return null;

  let metadata = rootMetadata;
  for (let i = 0; i < path.length; i += 1) {
    const field = findFieldInMetadata(metadata, path[i]);
    if (!field) return null;
    const ref = field.referenceEntity?.trim();
    if (!ref) return null;
    if (i === path.length - 1) return ref;
    metadata = metadataByEntity[ref] ?? null;
  }

  return null;
}

/** Ссылка на доменную сущность (Vehicle, User, …) — сразу «Значение» + api/vehicles и т.д. */
export function resolveNestedFilterDomainListEntity(
  field: ReportFieldDefinition | undefined,
  fieldName?: string,
): string | null {
  const compositeKind = fieldName ? parseCompositePropertyFieldName(fieldName) : undefined;
  if (compositeKind && isReportLeafDomainListEntity(compositeKind)) {
    return compositeKind;
  }
  const ref = field?.referenceEntity?.trim();
  if (!ref || !isReportLeafDomainListEntity(ref)) return null;
  return ref;
}

export function isNestedFilterPathReadyForValueInput(
  rootMetadata: ReportEntityMetadata | null | undefined,
  path: string[],
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
): boolean {
  if (!path.length) return false;
  const lastStep = path[path.length - 1];
  if (isReportCoordinatesCompositePropertyFieldName(lastStep)) return true;
  const leaf = resolveNestedFilterLeafField(rootMetadata, path, metadataByEntity);
  if (!leaf) return false;
  if (resolveNestedFilterDomainListEntity(leaf, lastStep)) return true;
  return !leaf.referenceEntity?.trim();
}

export function resolveNestedFilterApiFieldName(
  primaryField: ReportFieldDefinition,
  path: string[],
): string {
  if (!path.length) return primaryField.fieldName;
  const last = path[path.length - 1];
  if (isReportCoordinatesCompositePropertyFieldName(last)) {
    return primaryField.fieldName;
  }
  const compositeKind = parseCompositePropertyFieldName(last);
  if (compositeKind && compositeKind !== 'Coordinates') {
    const base = primaryField.fieldName;
    return base.endsWith('.id') ? base : `${base}.id`;
  }
  const attributePath = path.join('.');
  return resolveNestedEntityFilterFieldName(primaryField, attributePath);
}

export type NestedFilterPropertySegment = {
  kind: 'property';
  depth: number;
  entityName: string;
  metadata: ReportEntityMetadata | null;
  selectedFieldName: string | null;
  loading: boolean;
};

export type NestedFilterValueSegment = {
  kind: 'value';
  /** Имя сущности metadata, в которой выбрано листовое поле (User, Vehicle, …). */
  leafEntityName: string;
  field: ReportFieldDefinition;
  label: string;
};

/** Сущность metadata для листового поля path (откуда брать доменный справочник). */
export function resolveNestedFilterLeafEntityName(
  rootEntityName: string,
  rootMetadata: ReportEntityMetadata | null | undefined,
  path: string[],
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
): string {
  if (!path.length) return rootEntityName;

  const leaf = resolveNestedFilterLeafField(rootMetadata, path, metadataByEntity);
  const lastStep = path[path.length - 1];
  const domainListEntity = resolveNestedFilterDomainListEntity(leaf, lastStep);
  if (domainListEntity) return domainListEntity;

  let entityName = rootEntityName;
  let metadata = rootMetadata;

  for (let i = 0; i < path.length - 1; i += 1) {
    const field = findFieldInMetadata(metadata, path[i]);
    const ref = field?.referenceEntity?.trim();
    if (!ref) return entityName;
    entityName = ref;
    metadata = metadataByEntity[ref] ?? null;
  }

  return entityName;
}

export type NestedFilterUiSegment = NestedFilterPropertySegment | NestedFilterValueSegment;

/** Сегменты UI: несколько «Параметр сущности» и в конце «Значение». */
export function buildNestedFilterUiSegments(
  rootEntityName: string,
  rootMetadata: ReportEntityMetadata | null,
  path: string[],
  metadataByEntity: Record<string, ReportEntityMetadata | null>,
  loadingByEntity: Record<string, boolean>,
): NestedFilterUiSegment[] {
  const segments: NestedFilterUiSegment[] = [];

  if (!path.length) {
    segments.push({
      kind: 'property',
      depth: 0,
      entityName: rootEntityName,
      metadata: rootMetadata,
      selectedFieldName: null,
      loading: false,
    });
    return segments;
  }

  let metadata: ReportEntityMetadata | null | undefined = rootMetadata;
  let entityName = rootEntityName;

  for (let depth = 0; depth < path.length; depth += 1) {
    const selected = path[depth];
    segments.push({
      kind: 'property',
      depth,
      entityName,
      metadata: metadata ?? null,
      selectedFieldName: selected,
      loading: Boolean(loadingByEntity[entityName]),
    });

    const field = findFieldInMetadata(metadata, selected);
    const compositeKind = parseCompositePropertyFieldName(selected) as ReportCompositeKind | undefined;
    const nextRef =
      compositeKind && compositeKind !== 'Coordinates'
        ? compositeKind
        : field?.referenceEntity?.trim();

    if (
      depth === path.length - 1 &&
      compositeKind === 'Coordinates' &&
      isReportCoordinatesCompositePropertyFieldName(selected)
    ) {
      const valueField = buildSyntheticCoordinatesFilterField(field ?? undefined);
      segments.push({
        kind: 'value',
        leafEntityName: entityName,
        field: valueField,
        label: i18n.t('reports.composite.entityCoordinates'),
      });
      return segments;
    }

    if (!nextRef) {
      if (field) {
        let valueField = field;
        let valueLeafEntity = entityName;

        if (
          entityName !== 'EventsForFront' &&
          isEventsForFrontLevelAttribute(field.fieldName)
        ) {
          const levelField = resolveEventsForFrontLevelValueField(metadataByEntity);
          if (levelField) {
            valueField = levelField;
            valueLeafEntity = 'EventsForFront';
          }
        }

        segments.push({
          kind: 'value',
          leafEntityName: valueLeafEntity,
          field: valueField,
          label: (valueField.label ?? '').trim() || valueField.fieldName,
        });
      }
      return segments;
    }

    if (depth === path.length - 1 && nextRef && isReportLeafDomainListEntity(nextRef)) {
      const valueField =
        compositeKind && compositeKind !== 'Coordinates'
          ? buildSyntheticCompositeDomainListField(
              compositeKind,
              metadataByEntity[nextRef] ?? metadata,
            )
          : field;
      if (valueField) {
        segments.push({
          kind: 'value',
          leafEntityName: nextRef,
          field: valueField,
          label:
            compositeKind && compositeKind !== 'Coordinates'
              ? i18n.t(getReportCompositeEntityLabelKey(compositeKind))
              : (valueField.label ?? '').trim() || valueField.fieldName,
        });
      }
      return segments;
    }

    entityName = nextRef;
    metadata = metadataByEntity[nextRef] ?? null;

    if (depth === path.length - 1) {
      segments.push({
        kind: 'property',
        depth: depth + 1,
        entityName: nextRef,
        metadata,
        selectedFieldName: null,
        loading: Boolean(loadingByEntity[nextRef]),
      });
      return segments;
    }
  }

  return segments;
}
