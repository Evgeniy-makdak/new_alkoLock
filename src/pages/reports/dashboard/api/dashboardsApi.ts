import {
  deleteQuery,
  getQuery,
  postQuery,
  putQuery,
} from '@shared/api/baseQueryTypes';

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

/** definition → JSON-строка для поля String на бэке. */
export function stringifyDashboardDefinition(
  definition?: ReportDashboardAllotmentDefinition | null,
): string {
  const safe = sanitizeDefinition(definition ?? { ...EMPTY_DASHBOARD_QUERY_DEFINITION });
  return serializeReportQueryRequest(safe as ReportQueryRequest);
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
 * { name, description, visibility, definition: "<json-string>" }
 */
export async function createDashboard(
  body: BackendDashboardCreateBody,
): Promise<BackendDashboardDto> {
  const payload: BackendDashboardCreateBody = {
    name: body.name.trim(),
    description: body.description.trim(),
    visibility: body.visibility || 'private',
    definition: body.definition,
  };
  const res = await postQuery<BackendDashboardDto, BackendDashboardCreateBody>({
    url: BASE,
    data: payload,
  });
  return unwrap(res);
}

/**
 * PUT /api/v1/dashboards/{id}
 * { dataForUpdate: { name, description, visibility, definition: "<json-string>" } }
 */
export async function updateDashboard(
  id: number,
  body: BackendDashboardUpdateBody,
): Promise<BackendDashboardDto> {
  const res = await putQuery<BackendDashboardDto, BackendDashboardUpdateBody>({
    url: `${BASE}/${id}`,
    data: {
      dataForUpdate: {
        name: body.dataForUpdate.name.trim(),
        description: body.dataForUpdate.description.trim(),
        visibility: body.dataForUpdate.visibility || 'private',
        definition: body.dataForUpdate.definition,
      },
    },
  });
  return unwrap(
    res as {
      data: BackendDashboardDto | null;
      isError?: boolean;
      message?: string;
      detail?: string;
    },
  );
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
