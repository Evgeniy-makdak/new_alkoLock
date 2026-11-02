import {
  deleteQuery,
  getQuery,
  putQuery,
} from '@shared/api/baseQueryTypes';

import type { DashboardAccessLevel, ReportAccessDto, ReportAccessGrantBody } from '../types';

const BASE = 'api/v1/report-accesses';

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report-accesses request failed');
  }
  return res.data;
}

export function mapAccessLevelToPermission(level: DashboardAccessLevel): string {
  if (level === 'edit') return 'EDIT';
  if (level === 'manage') return 'MANAGE';
  return 'VIEW';
}

export function mapPermissionToAccessLevel(permission?: string | null): DashboardAccessLevel {
  const code = (permission ?? '').toUpperCase();
  if (code === 'EDIT' || code === 'WRITE') return 'edit';
  if (code === 'MANAGE' || code === 'ADMIN' || code === 'OWNER') return 'manage';
  return 'view';
}

/** GET /api/v1/report-accesses */
export async function fetchReportAccesses(params?: {
  reportId?: number;
}): Promise<ReportAccessDto[]> {
  const parts: string[] = [];
  if (params?.reportId != null) {
    parts.push(`all.report.id.equals=${params.reportId}`);
  }
  const url = parts.length ? `${BASE}?${parts.join('&')}` : BASE;
  const res = await getQuery<ReportAccessDto[] | { content?: ReportAccessDto[] }>({ url });
  const data = unwrap(res);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.content)) return data.content;
  return [];
}

/** GET /api/v1/report-accesses/{id} */
export async function fetchReportAccessById(id: number): Promise<ReportAccessDto> {
  const res = await getQuery<ReportAccessDto>({ url: `${BASE}/${id}` });
  return unwrap(res);
}

/**
 * PUT /api/v1/report-accesses/{id} — выдать права.
 * {id} трактуем как id отчёта (типичный паттерн grant-by-resource).
 */
export async function grantReportAccess(
  reportId: number,
  body: ReportAccessGrantBody,
): Promise<ReportAccessDto> {
  const res = await putQuery<ReportAccessDto, ReportAccessGrantBody>({
    url: `${BASE}/${reportId}`,
    data: body,
  });
  return unwrap(res);
}

/** DELETE /api/v1/report-accesses/{id} */
export async function deleteReportAccess(id: number): Promise<void> {
  const res = await deleteQuery<unknown>({ url: `${BASE}/${id}` });
  if (res.isError) {
    throw new Error(res.message || res.detail || 'failed to delete report access');
  }
}

/** PUT /api/v1/report-accesses/{id}/revoke */
export async function revokeReportAccess(id: number): Promise<void> {
  const res = await putQuery<unknown, Record<string, never>>({
    url: `${BASE}/${id}/revoke`,
    data: {},
  });
  if (res.isError) {
    throw new Error(res.message || res.detail || 'failed to revoke report access');
  }
}

/** PUT /api/v1/report-accesses/{id}/transfer/{newOwnerId} */
export async function transferReportAccess(id: number, newOwnerId: number): Promise<void> {
  const res = await putQuery<unknown, Record<string, never>>({
    url: `${BASE}/${id}/transfer/${newOwnerId}`,
    data: {},
  });
  if (res.isError) {
    throw new Error(res.message || res.detail || 'failed to transfer report access');
  }
}
