import { deleteQuery, getQuery, postQuery, putQuery } from '@shared/api/baseQueryTypes';

import type {
  BackendDashboardCreateBody,
  BackendDashboardDto,
  BackendDashboardUpdateBody,
} from '../types';

const BASE = 'api/v1/dashboards';

/** Размер порции списка дашбордов (дефолт бэка — 20). */
const DASHBOARDS_PAGE_SIZE = 200;

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.detail || res.message || 'dashboards request failed');
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

/**
 * Направление сортировки списка дашбордов:
 * ASC/DESC → &sort=name,…; null → fallback &sort=id,ASC (не «без sort»).
 */
export type DashboardsListSortDirection = 'ASC' | 'DESC' | null;

/** GET /api/v1/dashboards — дашборды, доступные пользователю (порядок — с бэка). */
export async function fetchDashboards(
  sortDirection: DashboardsListSortDirection = 'ASC',
): Promise<BackendDashboardDto[]> {
  const sortQuery =
    sortDirection === 'ASC' || sortDirection === 'DESC'
      ? `&sort=name,${sortDirection}`
      : '&sort=id,ASC';
  const res = await getQuery<BackendDashboardDto[] | { content?: BackendDashboardDto[] }>({
    url: `${BASE}?page=0&size=${DASHBOARDS_PAGE_SIZE}${sortQuery}`,
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
 * { name, visibility, definition: "<описание, не пустое>" }
 */
export async function createDashboard(
  body: BackendDashboardCreateBody,
): Promise<BackendDashboardDto> {
  const payload: BackendDashboardCreateBody = {
    name: body.name.trim(),
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
 * { dataForUpdate: { name, visibility, definition: "<описание, не пустое>" } }
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
