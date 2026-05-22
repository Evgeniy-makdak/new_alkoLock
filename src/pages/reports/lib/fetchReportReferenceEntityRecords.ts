import { isReportReferenceEntityServerSearch } from './reportReferenceEntityServerSearch';

/** @deprecated Справочники отчётов грузятся через fetchReportNestedEntityValueOptions (server search). */
export async function fetchReportReferenceEntityRecords(referenceEntity: string): Promise<unknown[]> {
  const ref = (referenceEntity ?? '').trim();
  if (!ref || isReportReferenceEntityServerSearch(ref)) {
    return [];
  }
  return [];
}
