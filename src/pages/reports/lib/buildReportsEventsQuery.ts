import type { Dayjs } from 'dayjs';

import { SortTypes } from '@shared/config/queryParamsEnums';
import { SortsTypes } from '@shared/config/queryParamsEnums';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { Formatters } from '@shared/utils/formatters';

import type { ReportsFilters } from '../model/reportsFiltersStore';

export function buildReportsEventsQuery(opts: {
  page: number;
  limit: number;
  searchQuery: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  filters: ReportsFilters;
  currentUserId: number | null;
  permission: string[];
  role: number[];
  branchId: ID | null | undefined;
}): QueryOptions {
  return {
    page: opts.page,
    limit: opts.limit,
    searchQuery: opts.searchQuery,
    startDate: Formatters.formatToISODate(opts.startDate),
    endDate: Formatters.formatToISODate(opts.endDate),
    sortBy: SortTypes.DATE_OCCURRENT,
    order: SortsTypes.desc,
    currentUserId: opts.currentUserId ?? undefined,
    permission: opts.permission,
    role: opts.role,
    filterOptions: {
      branchId: opts.branchId ?? undefined,
      users: Formatters.getStringForQueryParams(opts.filters.driverId),
      cars: Formatters.getStringForQueryParams(opts.filters.carId),
      alcolock: Formatters.getStringForQueryParams(opts.filters.alcolocks),
      eventsByType: opts.filters.typeEvent,
      level: opts.filters.level,
    },
  };
}
