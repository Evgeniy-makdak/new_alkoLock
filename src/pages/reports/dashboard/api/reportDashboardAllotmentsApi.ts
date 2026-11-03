import {
  deleteQuery,
  getQuery,
  postQuery,
} from '@shared/api/baseQueryTypes';

import type {
  ReportDashboardAllotment,
  ReportDashboardAllotmentDefinition,
  ReportDashboardAllotmentListParams,
} from '../types';

const BASE = 'api/v1/report-dashboard-allotments';

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.detail || res.message || 'report-dashboard-allotments request failed');
  }
  return res.data;
}

function appendCriteria(
  parts: string[],
  path: string,
  filter?: { equals?: number; in?: number[] },
): void {
  if (!filter) return;
  if (filter.equals != null && Number.isFinite(filter.equals)) {
    parts.push(`${path}.equals=${filter.equals}`);
  }
  if (filter.in?.length) {
    parts.push(`${path}.in=${filter.in.filter((n) => Number.isFinite(n)).join(',')}`);
  }
}

function buildListUrl(params?: ReportDashboardAllotmentListParams): string {
  const parts: string[] = [];
  if (params?.page != null) parts.push(`page=${params.page}`);
  if (params?.size != null) parts.push(`size=${params.size}`);
  appendCriteria(parts, 'all.id', params?.id);
  appendCriteria(parts, 'all.report.id', params?.reportId);
  appendCriteria(parts, 'all.dashboard.id', params?.dashboardId);
  if (params?.isActiveEquals != null) {
    parts.push(`all.isActive.equals=${params.isActiveEquals}`);
  }
  return parts.length ? `${BASE}?${parts.join('&')}` : BASE;
}

export type CreateReportDashboardAllotmentBody = {
  reportId: number;
  dashboardId: number;
  definition: ReportDashboardAllotmentDefinition;
};

/**
 * POST /api/v1/report-dashboard-allotments
 *
 * Проверено в браузере (Create = один объект, не массив):
 * - `reportId` в body принимается (без него — «Поле не может быть пустым»)
 * - при любом непустом `dashboardIds` / `dashboards` / `selectedFields` /
 *   nested `definition` / query `dashboardIds` остаётся «Список не может быть пустым»
 * - swagger Example с definition-полями не закрывает @NotEmpty-коллекцию
 *
 * Пока бэкенд не подтвердит имя коллекции в `ReportDashboardAllotmentDto.Create`,
 * шлём reportId + dashboardIds + definition (как в Example). Soft-fail в store
 * сохраняет виджет локально.
 */
export async function createReportDashboardAllotment(
  options: CreateReportDashboardAllotmentBody,
): Promise<ReportDashboardAllotment[]> {
  const def = options.definition ?? { selectedFields: [], filters: [] };
  const body = {
    reportId: options.reportId,
    dashboardIds: [options.dashboardId],
    selectedFields: def.selectedFields ?? [],
    filters: def.filters ?? [],
    ...(def.groupBy ? { groupBy: def.groupBy } : {}),
    ...(def.having ? { having: def.having } : {}),
    ...(def.logicConnects ? { logicConnects: def.logicConnects } : {}),
    ...(def.groupConnections ? { groupConnections: def.groupConnections } : {}),
    ...(def.havingConnects ? { havingConnects: def.havingConnects } : {}),
    ...(def.havingGroupConnections
      ? { havingGroupConnections: def.havingGroupConnections }
      : {}),
    ...(def.pageableDto ? { pageableDto: def.pageableDto } : {}),
  };

  const res = await postQuery<
    ReportDashboardAllotment[] | ReportDashboardAllotment,
    typeof body
  >({
    url: BASE,
    data: body,
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : data ? [data] : [];
}

/** GET /api/v1/report-dashboard-allotments/{id} */
export async function fetchReportDashboardAllotmentById(
  id: number,
): Promise<ReportDashboardAllotment> {
  const res = await getQuery<ReportDashboardAllotment>({
    url: `${BASE}/${id}`,
  });
  return unwrap(res);
}

/**
 * GET /api/v1/report-dashboard-allotments
 * Criteria: all.id / all.report.id / all.dashboard.id + pagination.
 */
export async function fetchReportDashboardAllotments(
  params?: ReportDashboardAllotmentListParams,
): Promise<ReportDashboardAllotment[]> {
  const res = await getQuery<ReportDashboardAllotment[] | { content?: ReportDashboardAllotment[] }>({
    url: buildListUrl(params),
  });
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
}

/** DELETE /api/v1/report-dashboard-allotments/{id} */
export async function deleteReportDashboardAllotment(id: number): Promise<void> {
  const res = await deleteQuery<unknown>({
    url: `${BASE}/${id}`,
  });
  if (res.isError) {
    throw new Error(res.detail || res.message || 'failed to delete report-dashboard-allotment');
  }
}
