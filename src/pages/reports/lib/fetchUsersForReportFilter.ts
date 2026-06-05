import { UsersApi } from '@shared/api/baseQuerys';
import type { IUser } from '@shared/types/BaseQueryTypes';

import { fetchAllReportReferencePages } from './fetchAllReportReferencePages';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

type FetchUsersForReportFilterOptions = {
  pageSize?: number;
  searchQuery?: string;
  branchId?: number | string;
  driversOnly?: boolean;
};

/**
 * Полные записи пользователей для фильтров отчёта (телефон, email, …).
 * GET api/users — не full-name: в full-name нет скалярных полей вроде phone.
 */
export async function fetchUsersForReportFilter(
  options: FetchUsersForReportFilterOptions = {},
): Promise<IUser[]> {
  const pageSize = options.pageSize ?? REPORT_REFERENCE_LIST_PAGE_SIZE;
  const match = (options.searchQuery ?? '').trim();
  const branchFilter =
    options.branchId != null ? { branchId: options.branchId } : {};

  return fetchAllReportReferencePages<IUser>(
    (page) =>
      UsersApi.getList(
        {
          page,
          limit: pageSize,
          searchQuery: match,
          query: '&all.isActive.in=true',
          filterOptions: {
            ...branchFilter,
            ...(options.driversOnly ? { driverSpecified: true } : {}),
          },
        },
        false,
      ),
    pageSize,
  );
}
