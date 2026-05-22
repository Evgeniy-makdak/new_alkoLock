import type { Values } from '@shared/ui/search_multiple_select';

import { fetchReportNestedEntityValueOptions } from './fetchReportNestedEntityValueOptions';
import { isReportReferenceEntityServerSearch } from './reportReferenceEntityServerSearch';
import type { ReportFieldDefinition } from '../types/reportApiTypes';

/**
 * Список значений для фильтра по полю сущности (referenceEntity из metadata отчёта).
 */
export async function fetchReportReferenceEntityValues(referenceEntity: string): Promise<Values> {
  const ref = (referenceEntity ?? '').trim();
  if (!ref) return [];

  if (isReportReferenceEntityServerSearch(ref)) {
    const idField: ReportFieldDefinition = {
      fieldName: 'id',
      label: 'id',
      alias: null,
      type: 'ENTITY',
      filterable: true,
      sortable: true,
      groupable: true,
      aggregation: null,
      availableOperations: [],
      availableFunctions: [],
    };
    return fetchReportNestedEntityValueOptions(ref, idField, '');
  }

  return [];
}
