import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

import {
  isReportCoordinatesCompositePath,
  isReportCoordinatesCompositePropertyFieldName,
} from './reportCoordinateComposite';
import { shouldForceEventsForFrontDomainList } from './eventsForFrontReportOptions';
import {
  isReportBooleanField,
  isReportDateTimeField,
  isReportTimeOnlyField,
  isReportYearOnlyField,
} from './reportFieldFilterKind';
import { resolveReportDomainListEntityName } from './reportLeafEntityListApi';
import { resolveReportMetadataValueLoadKind } from './reportMetadataFilterOptions';

export type NestedEntityValueLoadKind =
  | 'static'
  | 'enum'
  | 'textInput'
  | 'domainList'
  | 'dateTime'
  | 'year'
  | 'coordinate'
  | 'coordinatePairInput';

function isCoordinatesCompositeFilterField(field: ReportFieldDefinition): boolean {
  const name = field.fieldName ?? '';
  return (
    isReportCoordinatesCompositePropertyFieldName(name) || isReportCoordinatesCompositePath(name)
  );
}

function canLoadCoordinatesFromDomainApi(leafEntityName: string): boolean {
  return Boolean(resolveReportDomainListEntityName(leafEntityName));
}

/** Список сущностей (id + подпись) вместо значений скалярного поля. */
export function isNestedEntityListPickerField(
  field: ReportFieldDefinition,
  attribute: string,
): boolean {
  const attr = (attribute ?? '').trim();
  if (attr === 'id') return true;
  const type = (field.type ?? '').toUpperCase();
  if (type === 'ENTITY') return true;
  if (field.referenceEntity?.trim()) return true;
  return false;
}

/** Скаляры и ENTITY на leaf-сущности — значения из доменного API, не из metadata.ENUM. */
export function shouldForceReportLeafDomainList(
  leafEntityName: string,
  field: ReportFieldDefinition | undefined,
): boolean {
  if (!field) return false;
  const domainEntity = resolveReportDomainListEntityName(leafEntityName);
  if (!domainEntity) return false;
  if (isReportBooleanField(field)) return false;
  if (isReportDateTimeField(field) || isReportTimeOnlyField(field)) return false;
  if (isReportYearOnlyField(field)) return false;
  return true;
}

/**
 * Листовое «Значение»: тип/ENUM/BOOLEAN из metadata; иначе доменный API по leafEntityName.
 * Координаты при наличии доменного API — dropdown (пары / lat / lon), не ручной ввод.
 */
export function resolveNestedEntityValueLoadKind(
  field: ReportFieldDefinition | undefined,
  leafEntityName: string,
): NestedEntityValueLoadKind {
  if (field && isCoordinatesCompositeFilterField(field)) {
    return canLoadCoordinatesFromDomainApi(leafEntityName)
      ? 'domainList'
      : 'coordinatePairInput';
  }

  // BOOLEAN / ENUM / DATETIME / YEAR — из metadata; COORDINATE — из domain API при наличии.
  const fromMetadata = resolveReportMetadataValueLoadKind(field);
  if (fromMetadata === 'coordinate') {
    return canLoadCoordinatesFromDomainApi(leafEntityName) ? 'domainList' : 'coordinate';
  }
  if (fromMetadata !== 'textInput') {
    return fromMetadata;
  }

  if (shouldForceEventsForFrontDomainList(leafEntityName, field)) {
    return 'domainList';
  }

  if (shouldForceReportLeafDomainList(leafEntityName, field)) {
    return 'domainList';
  }

  return 'textInput';
}

export function buildNestedEntityStaticValueOptions(
  field: ReportFieldDefinition,
  t: TFunction,
): Values {
  if (isReportBooleanField(field)) {
    return [
      { value: 'true', label: t('reports.table.activeYes') },
      { value: 'false', label: t('reports.table.activeNo') },
    ];
  }
  return [];
}
