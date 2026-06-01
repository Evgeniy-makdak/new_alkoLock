import type { Values } from '@shared/ui/search_multiple_select';

/**
 * @deprecated Значения для referenceEntity — из metadata отчёта, не из доменных API.
 */
export async function fetchReportReferenceEntityValues(
  _referenceEntity: string,
): Promise<Values> {
  return [];
}
