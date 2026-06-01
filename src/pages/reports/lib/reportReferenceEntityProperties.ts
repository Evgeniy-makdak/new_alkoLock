import type { TFunction } from 'i18next';

import type { Values } from '@shared/ui/search_multiple_select';

import { buildReferenceEntityPropertyOptions as buildFromMetadata } from './reportMetadataFilterOptions';

import type { ReportEntityMetadata } from '../types/reportApiTypes';

/**
 * @deprecated Статические списки не используются — только metadata отчёта.
 * @see buildReferenceEntityPropertyOptions
 */
export const REPORT_REFERENCE_ENTITY_PROPERTIES: Record<
  string,
  { key: string; labelKey: string }[]
> = {};

/** «Параметр сущности» — только GET api/v1/reports/{referenceEntity}/metadata (filterable). */
export function buildReferenceEntityPropertyOptions(
  _referenceEntity: string,
  tableMetadata: ReportEntityMetadata | null | undefined,
  _t: TFunction,
): Values {
  return buildFromMetadata(tableMetadata);
}
