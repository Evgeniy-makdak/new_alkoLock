import axios from 'axios';

import {
  deleteQuery,
  getApiUrl,
  getQuery,
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
  BackendDashboardCreateBody,
  BackendDashboardDto,
  BackendDashboardUpdateBody,
  ReportDashboardAllotmentDefinition,
} from '../types';
import { EMPTY_DASHBOARD_QUERY_DEFINITION } from '../lib/mapAllotmentToWidget';

const BASE = 'api/v1/dashboards';

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'dashboards request failed');
  }
  return res.data;
}

function asDashboardList(
  data: BackendDashboardDto[] | { content?: BackendDashboardDto[] },
): BackendDashboardDto[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
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

function serializeDefinition(body: ReportDashboardAllotmentDefinition): string {
  return serializeReportQueryRequest(sanitizeDefinition(body) as ReportQueryRequest);
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

/** GET /api/v1/dashboards */
export async function fetchDashboards(): Promise<BackendDashboardDto[]> {
  const res = await getQuery<BackendDashboardDto[] | { content?: BackendDashboardDto[] }>({
    url: BASE,
  });
  return asDashboardList(unwrap(res));
}

/** GET /api/v1/dashboards/{id} */
export async function fetchDashboardById(id: number): Promise<BackendDashboardDto> {
  const res = await getQuery<BackendDashboardDto>({
    url: `${BASE}/${id}`,
  });
  return unwrap(res);
}

/**
 * POST /api/v1/dashboards
 * { name, visibility, definition, description? }
 * «Описание дашборда» в 400 = definition (query), не text description.
 */
export async function createDashboard(
  body: BackendDashboardCreateBody,
): Promise<BackendDashboardDto> {
  const definition = sanitizeDefinition(
    body.definition ?? { ...EMPTY_DASHBOARD_QUERY_DEFINITION },
  );
  const definitionJson = serializeDefinition(definition);
  const parts = [
    `"name":${JSON.stringify(body.name.trim())}`,
    `"visibility":${JSON.stringify(body.visibility || 'private')}`,
    `"definition":${definitionJson}`,
  ];
  const textDescription = body.description?.trim();
  if (textDescription) {
    parts.push(`"description":${JSON.stringify(textDescription)}`);
  }
  const payload = `{${parts.join(',')}}`;
  const res = await postRawJson<BackendDashboardDto>(BASE, payload);
  return unwrap(res);
}

/**
 * PUT /api/v1/dashboards/{id}
 * { dataForUpdate: { name, visibility, definition, description? } }
 */
export async function updateDashboard(
  id: number,
  body: BackendDashboardUpdateBody,
): Promise<BackendDashboardDto> {
  const { name, visibility, definition, description } = body.dataForUpdate;
  const parts = [
    `"name":${JSON.stringify(name)}`,
    `"visibility":${JSON.stringify(visibility)}`,
    `"definition":${serializeDefinition(definition)}`,
  ];
  const textDescription = description?.trim();
  if (textDescription) {
    parts.push(`"description":${JSON.stringify(textDescription)}`);
  }
  const payload = `{"dataForUpdate":{${parts.join(',')}}}`;
  const res = await putRawJson<BackendDashboardDto>(`${BASE}/${id}`, payload);
  return unwrap(res);
}

/** DELETE /api/v1/dashboards/{id} */
export async function deleteDashboard(id: number): Promise<void> {
  const res = await deleteQuery<unknown>({
    url: `${BASE}/${id}`,
  });
  if (res.isError) {
    throw new Error(res.message || res.detail || 'failed to delete dashboard');
  }
}
