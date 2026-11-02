import axios from 'axios';

import {
  getApiUrl,
  getQuery,
  deleteQuery,
  returnHeaders,
  viewResErrors,
} from '@shared/api/baseQueryTypes';
import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';

import {
  finalizeReportQueryBodyForGroupBy,
  serializeReportQueryRequest,
} from '../../lib/buildReportGroupParam';
import {
  expandCompositeSelectedFields,
  isReportCompositeFieldPath,
} from '../../lib/reportEntityCompositeFields';
import type { ReportQueryRequest } from '../../types/reportApiTypes';
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
    throw new Error(res.message || res.detail || 'report-dashboard-allotments request failed');
  }
  return res.data;
}

function sanitizeDefinition(body: ReportDashboardAllotmentDefinition): ReportDashboardAllotmentDefinition {
  const selectedFields = expandCompositeSelectedFields(body.selectedFields ?? []).filter(
    (field) => field.fieldName && !isReportCompositeFieldPath(field.fieldName),
  );
  const sanitized = finalizeReportQueryBodyForGroupBy({
    ...body,
    selectedFields,
  }) as ReportDashboardAllotmentDefinition;
  if (body.pageableDto) {
    sanitized.pageableDto = body.pageableDto;
  }
  return sanitized;
}

/** POST body — сырой JSON (как у reports query: Long → N.0). */
async function postAllotmentDefinition(
  url: string,
  body: ReportDashboardAllotmentDefinition,
): Promise<AppAxiosResponse<ReportDashboardAllotment[]>> {
  const requestUrl = `${getApiUrl()}${url}`;
  const sanitized = sanitizeDefinition(body);
  // serializeReportQueryRequest обрабатывает Long-маркеры; pageableDto уходит как есть.
  const payload = serializeReportQueryRequest(sanitized as ReportQueryRequest);
  try {
    const res = await axios.post<ReportDashboardAllotment[]>(requestUrl, payload, {
      headers: {
        ...returnHeaders(),
        'Content-Type': 'application/json',
      },
      transformRequest: [(data) => data],
    });
    return res as AppAxiosResponse<ReportDashboardAllotment[]>;
  } catch (e) {
    return viewResErrors<ReportDashboardAllotment[]>(e as Parameters<typeof viewResErrors>[0]);
  }
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

/**
 * POST /api/v1/report-dashboard-allotments
 * Body = definition отчёта. Опционально dashboardId в query — привязка к уже существующему дашборду.
 */
export async function createReportDashboardAllotment(
  definition: ReportDashboardAllotmentDefinition,
  options?: { dashboardId?: number },
): Promise<ReportDashboardAllotment[]> {
  const query =
    options?.dashboardId != null && Number.isFinite(options.dashboardId)
      ? `?dashboardId=${options.dashboardId}`
      : '';
  const res = await postAllotmentDefinition(`${BASE}${query}`, definition);
  const data = unwrap(res);
  return Array.isArray(data) ? data : data ? [data as unknown as ReportDashboardAllotment] : [];
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
    throw new Error(res.message || res.detail || 'failed to delete report-dashboard-allotment');
  }
}
