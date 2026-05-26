import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

import {
  isReportBooleanField,
  isReportCoordinateField,
  isReportDateTimeField,
  isReportTimeOnlyField,
  isReportYearOnlyField,
} from './reportFieldFilterKind';

export type NestedEntityValueLoadKind =
  | 'static'
  | 'serverSearch'
  | 'referenceList'
  | 'frontDataEnum'
  | 'dateTime'
  | 'year'
  | 'coordinate';

/** Как подгружать опции «Значение» для выбранного поля metadata. */
export function resolveNestedEntityValueLoadKind(
  field: ReportFieldDefinition | undefined,
  referenceEntity: string,
  attribute: string,
): NestedEntityValueLoadKind {
  if (!field) {
    return 'serverSearch';
  }
  if (isReportYearOnlyField(field)) {
    return 'year';
  }
  if (isReportDateTimeField(field) || isReportTimeOnlyField(field)) {
    return 'dateTime';
  }
  if (isReportBooleanField(field)) {
    return 'static';
  }
  if (isReportCoordinateField(field)) {
    return 'coordinate';
  }
  const type = (field.type ?? '').toUpperCase();
  if (type === 'ENUM') {
    if (referenceEntity === 'Vehicle' && (attribute === 'type' || attribute === 'color')) {
      return 'frontDataEnum';
    }
    return 'serverSearch';
  }
  return 'serverSearch';
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
