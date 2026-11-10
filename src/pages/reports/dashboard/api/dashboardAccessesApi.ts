import { UsersApi } from '@shared/api/baseQuerys';
import { getQuery, putQuery } from '@shared/api/baseQueryTypes';

import type { BackendDashboardAccessDto, DashboardAccessEntry, DashboardAccessLevel } from '../types';

const BASE = 'api/v1/dashboard-accesses';

/** Порция прав за один запрос. */
const ACCESS_PAGE_SIZE = 500;

type GroupRight = { userId: number; permission: 'READ' | 'WRITE' };

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.detail || res.message || 'dashboard-accesses request failed');
  }
  return res.data;
}

export function mapAccessLevelToPermission(level: DashboardAccessLevel): GroupRight['permission'] {
  return level === 'edit' ? 'WRITE' : 'READ';
}

export function mapPermissionToAccessLevel(permission?: string | null): DashboardAccessLevel {
  return (permission ?? '').toUpperCase() === 'WRITE' ? 'edit' : 'view';
}

function userLabelOf(user: NonNullable<BackendDashboardAccessDto['user']>): string {
  return (
    (user.fullName ?? '').trim() ||
    [user.surname, user.firstName, user.middleName].filter(Boolean).join(' ').trim() ||
    user.email ||
    user.login ||
    `ID ${user.id}`
  );
}

/** ФИО пользователей, уже полученные с бэка (в ответе dashboard-accesses у user только id и email). */
const userFullNameCache = new Map<number, string>();

async function resolveUserFullName(userId: number): Promise<string> {
  const cached = userFullNameCache.get(userId);
  if (cached) return cached;
  try {
    const res = await UsersApi.getUser(userId);
    if (res.isError || res.data == null) return '';
    const user = res.data as {
      fullName?: string;
      surname?: string;
      firstName?: string;
      middleName?: string;
    };
    const name =
      (user.fullName ?? '').trim() ||
      [user.surname, user.firstName, user.middleName].filter(Boolean).join(' ').trim();
    if (name) userFullNameCache.set(userId, name);
    return name;
  } catch {
    return '';
  }
}

/** GET /api/v1/dashboard-accesses для одного дашборда. */
export async function fetchDashboardAccesses(
  dashboardId: number,
): Promise<DashboardAccessEntry[]> {
  const res = await getQuery<
    BackendDashboardAccessDto[] | { content?: BackendDashboardAccessDto[] }
  >({
    url: `${BASE}?page=0&size=${ACCESS_PAGE_SIZE}&all.dashboard.id.equals=${dashboardId}`,
  });
  const data = unwrap(res);
  const list = Array.isArray(data) ? data : (data.content ?? []);

  const entries: DashboardAccessEntry[] = [];
  for (const item of list) {
    if (item.isActive === false) continue;
    const userId = item.user?.id;
    if (userId == null || !item.user) continue;
    entries.push({
      userId,
      userLabel: userLabelOf(item.user),
      level: mapPermissionToAccessLevel(item.permission),
    });
  }
  // В ответе у пользователя только id/email — подписываем ФИО (как у владельца дашборда).
  await Promise.all(
    entries.map(async (entry, index) => {
      const hasFullName = list.find((item) => item.user?.id === entry.userId)?.user?.fullName;
      if (hasFullName?.trim()) return;
      const name = await resolveUserFullName(entry.userId);
      if (name) entries[index] = { ...entry, userLabel: name };
    }),
  );
  return entries;
}

/** PUT /api/v1/dashboard-accesses/{dashboardId} — выдать/изменить права. */
export async function grantDashboardAccess(
  dashboardId: number,
  rights: Array<{ userId: number; level: DashboardAccessLevel }>,
): Promise<void> {
  if (!rights.length) return;
  const groupRights: GroupRight[] = rights.map((right) => ({
    userId: right.userId,
    permission: mapAccessLevelToPermission(right.level),
  }));
  const res = await putQuery<unknown, { groupRights: GroupRight[] }>({
    url: `${BASE}/${dashboardId}`,
    data: { groupRights },
  });
  if (res.isError) {
    throw new Error(res.detail || res.message || 'failed to grant dashboard access');
  }
}

/** PUT /api/v1/dashboard-accesses/{dashboardId}/revoke — отозвать права. */
export async function revokeDashboardAccess(
  dashboardId: number,
  userIds: number[],
): Promise<void> {
  if (!userIds.length) return;
  const res = await putQuery<unknown, { userIds: number[] }>({
    url: `${BASE}/${dashboardId}/revoke`,
    data: { userIds },
  });
  if (res.isError) {
    throw new Error(res.detail || res.message || 'failed to revoke dashboard access');
  }
}
