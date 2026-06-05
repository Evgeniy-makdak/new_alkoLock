import { getSelectBranchQueryUrl } from '@shared/lib/getUrlForQueries';
import { Formatters } from '@shared/utils/formatters';

import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

/**
 * Список device-actions для фильтров отчёта.
 * Сортировка по occurredAt (поле DeviceAction), не timestamp — как в getEventListForAutoServiceURL.
 */
export function buildReportDeviceActionsListUrl(
  pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE,
  branchId?: number | string | null,
  searchQuery?: string,
  page = 0,
): string {
  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
  const branchQ =
    branchId != null
      ? getSelectBranchQueryUrl({
          branchId,
          page: 'device',
          useAssignmentPrefix: true,
          parameters: '',
        })
      : '';
  const searchQ = match ? `&all.match.contains=${encodeURIComponent(match)}` : '';
  const serviceModeQ =
    '&all.type.in=SERVICE_MODE_ACTIVATE,SERVICE_MODE_DEACTIVATE&all.seen.in=false&all.status.notIn=INVALID';
  return `api/device-actions?page=${page}&size=${pageSize}${branchQ}${serviceModeQ}${searchQ}&sort=occurredAt,DESC&sort=id,DESC`;
}
