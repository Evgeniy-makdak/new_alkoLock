import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

import { isReportBooleanField } from './reportFieldFilterKind';
import { isReportLeafDomainListEntity } from './reportLeafEntityListApi';
import { resolveReportMetadataValueLoadKind } from './reportMetadataFilterOptions';

export type NestedEntityValueLoadKind =
  | 'static'
  | 'enum'
  | 'textInput'
  | 'domainList'
  | 'dateTime'
  | 'year'
  | 'coordinate';

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

/**
 * Листовое «Значение»: сначала тип из metadata; для скаляров — доменный API по leafEntityName.
 */
export function resolveNestedEntityValueLoadKind(
  field: ReportFieldDefinition | undefined,
  leafEntityName: string,
): NestedEntityValueLoadKind {
  const fromMetadata = resolveReportMetadataValueLoadKind(field);
  if (fromMetadata !== 'textInput') {
    return fromMetadata;
  }
  if (isReportLeafDomainListEntity(leafEntityName)) {
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
