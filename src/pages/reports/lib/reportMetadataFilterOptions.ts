import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import { buildReferenceEntityPropertyOptionsWithComposite } from './reportEntityCompositeFields';
import { buildNestedEntityStaticValueOptions } from './reportNestedEntityValueOptions';
import {
  isReportBooleanField,
  isReportCoordinateField,
  isReportDateTimeField,
  isReportTimeOnlyField,
  isReportYearOnlyField,
} from './reportFieldFilterKind';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
} from '../types/reportApiTypes';

/** «Параметр сущности» — filterable-поля metadata; члены группы — одна опция «Пользователь» и т.д. */
export function buildReferenceEntityPropertyOptions(
  tableMetadata: ReportEntityMetadata | null | undefined,
  t: TFunction,
): Values {
  return buildReferenceEntityPropertyOptionsWithComposite(tableMetadata, t);
}

function readAllowedValues(field: ReportFieldDefinition): Values {
  const raw = field.allowedValues;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  return raw
    .map((item) => {
      if (item == null) return null;
      if (typeof item === 'string' || typeof item === 'number') {
        const s = String(item);
        return { value: s, label: s };
      }
      if (typeof item === 'object') {
        const o = item as { value?: unknown; label?: unknown; code?: unknown; name?: unknown };
        const value = o.value ?? o.code ?? o.name;
        if (value == null || value === '') return null;
        const label = o.label ?? o.name ?? value;
        return { value: String(value), label: String(label) };
      }
      return null;
    })
    .filter((x) => x != null) as Values;
}

/** Опции «Значение» по описанию поля из metadata (BOOLEAN, ENUM/allowedValues). */
export function buildReportAttributeValueOptions(
  field: ReportFieldDefinition | undefined,
  t: TFunction,
): Values {
  if (!field) return [];
  if (isReportBooleanField(field)) {
    return buildNestedEntityStaticValueOptions(field, t);
  }
  const type = (field.type ?? '').toUpperCase();
  if (type === 'ENUM') {
    return readAllowedValues(field);
  }
  return [];
}

/** Как отображать ввод значения фильтра — только по типу поля из metadata. */
export function resolveReportMetadataValueLoadKind(
  field: ReportFieldDefinition | undefined,
): 'static' | 'enum' | 'dateTime' | 'year' | 'coordinate' | 'textInput' {
  if (!field) return 'textInput';
  if (isReportYearOnlyField(field)) return 'year';
  if (isReportDateTimeField(field) || isReportTimeOnlyField(field)) return 'dateTime';
  if (isReportBooleanField(field)) return 'static';
  if (isReportCoordinateField(field)) return 'coordinate';
  const type = (field.type ?? '').toUpperCase();
  if (type === 'ENUM' && readAllowedValues(field).length > 0) {
    return 'enum';
  }
  return 'textInput';
}
