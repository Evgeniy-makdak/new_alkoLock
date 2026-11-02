import axios from 'axios';

import {
  deleteQuery,
  getApiUrl,
  getQuery,
  putQuery,
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
  ReportDashboardAllotmentDefinition,
  ReportDashboardAllotmentReport,
  SavedReportWriteBody,
} from '../types';

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'saved reports request failed');
  }
  return res.data;
}

function sanitizeDefinition(
  body: ReportDashboardAllotmentDefinition,
): ReportDashboardAllotmentDefinition {
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

async function postRawJson<T>(url: string, payload: string): Promise<AppAxiosResponse<T>> {
  const requestUrl = `${getApiUrl()}${url}`;
  try {
    const res = await axios.post<T>(requestUrl, payload, {
      headers: {
        ...returnHeaders(),
        'Content-Type': 'application/json',
      },
      transformRequest: [(data) => data],
    });
    return res as AppAxiosResponse<T>;
  } catch (e) {
    return viewResErrors<T>(e as Parameters<typeof viewResErrors>[0]);
  }
}

async function putRawJson<T>(url: string, payload: string): Promise<AppAxiosResponse<T>> {
  const requestUrl = `${getApiUrl()}${url}`;
  try {
    const res = await axios.put<T>(requestUrl, payload, {
      headers: {
        ...returnHeaders(),
        'Content-Type': 'application/json',
      },
      transformRequest: [(data) => data],
    });
    return res as AppAxiosResponse<T>;
  } catch (e) {
    return viewResErrors<T>(e as Parameters<typeof viewResErrors>[0]);
  }
}

function buildSavePayload(body: SavedReportWriteBody): string {
  const definition = sanitizeDefinition(body.definition);
  // Плоский payload: name + поля definition (как в Swagger selectedFields/filters/…).
  const flat = {
    name: body.name,
    ...(body.visibility ? { visibility: body.visibility } : {}),
    ...definition,
  };
  return serializeReportQueryRequest(flat as unknown as ReportQueryRequest);
}

/** POST /api/v1/reports/{entityName}/save — сохранить параметры отчёта. */
export async function saveReportForEntity(
  entityName: string,
  body: SavedReportWriteBody,
): Promise<ReportDashboardAllotmentReport> {
  const encoded = encodeURIComponent(entityName);
  const res = await postRawJson<ReportDashboardAllotmentReport>(
    `api/v1/reports/${encoded}/save`,
    buildSavePayload(body),
  );
  return unwrap(res);
}

/** GET /api/v1/reports/{id} */
export async function fetchSavedReportById(id: number): Promise<ReportDashboardAllotmentReport> {
  const res = await getQuery<ReportDashboardAllotmentReport>({
    url: `api/v1/reports/${id}`,
  });
  return unwrap(res);
}

/** PUT /api/v1/reports/{id} */
export async function updateSavedReport(
  id: number,
  body: SavedReportWriteBody,
): Promise<ReportDashboardAllotmentReport> {
  const res = await putRawJson<ReportDashboardAllotmentReport>(
    `api/v1/reports/${id}`,
    buildSavePayload(body),
  );
  return unwrap(res);
}

/** DELETE /api/v1/reports/{id} */
export async function deleteSavedReport(id: number): Promise<void> {
  const res = await deleteQuery<unknown>({
    url: `api/v1/reports/${id}`,
  });
  if (res.isError) {
    throw new Error(res.message || res.detail || 'failed to delete saved report');
  }
}

/** GET /api/v1/reports — список сохранённых отчётов. */
export async function fetchSavedReports(): Promise<ReportDashboardAllotmentReport[]> {
  const res = await getQuery<
    ReportDashboardAllotmentReport[] | { content?: ReportDashboardAllotmentReport[] }
  >({
    url: 'api/v1/reports',
  });
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
}

/** На случай, если PUT через putQuery удобнее без Long-маркеров. */
export async function updateSavedReportMeta(
  id: number,
  patch: { name?: string; visibility?: string },
): Promise<ReportDashboardAllotmentReport> {
  const res = await putQuery<ReportDashboardAllotmentReport, typeof patch>({
    url: `api/v1/reports/${id}`,
    data: patch,
  });
  return unwrap(
    res as {
      data: ReportDashboardAllotmentReport | null;
      isError?: boolean;
      message?: string;
      detail?: string;
    },
  );
}
