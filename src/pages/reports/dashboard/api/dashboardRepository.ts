import type { ReportDashboard } from '../types';
import {
  collectAllotmentIdsFromLayout,
  collectReportIdsFromLayout,
  mapBackendDashboardToReportDashboard,
  mergeAllotmentsIntoLayout,
  parseBackendDashboardId,
  resolveDashboardQueryDefinition,
} from '../lib/mapAllotmentToWidget';
import {
  createDashboard as createDashboardRequest,
  deleteDashboard as deleteDashboardRequest,
  fetchDashboardById,
  fetchDashboards,
  updateDashboard as updateDashboardRequest,
} from './dashboardsApi';
import {
  deleteReportDashboardAllotment,
  fetchReportDashboardAllotments,
} from './reportDashboardAllotmentsApi';
import { deleteSavedReport } from './savedReportsApi';

const STORAGE_KEY = 'alkoLock.reports.dashboards.v1';

export type DashboardRepository = {
  list: () => Promise<ReportDashboard[]>;
  getById: (id: string) => Promise<ReportDashboard | null>;
  save: (dashboard: ReportDashboard) => Promise<ReportDashboard>;
  remove: (id: string) => Promise<void>;
};

function readCache(): ReportDashboard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ReportDashboard[]) : [];
  } catch {
    return [];
  }
}

function writeCache(items: ReportDashboard[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // quota / private mode
  }
}

function sortByUpdatedAt(items: ReportDashboard[]): ReportDashboard[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function shellFromCache(id: string, cache: ReportDashboard[]) {
  const cached = cache.find((item) => item.id === id);
  if (!cached) return null;
  return {
    description: cached.description,
    layout: cached.layout,
    access: cached.access,
  };
}

function mergeClientShell(
  mapped: ReportDashboard,
  shell: ReportDashboard | null | undefined,
): ReportDashboard {
  if (!shell) return mapped;
  return {
    ...mapped,
    description: shell.description || mapped.description,
    layout: shell.layout ?? mapped.layout,
    access: shell.access ?? mapped.access,
    // сохраняем клиентский queryDefinition, если бэк вернул пустой
    queryDefinition:
      shell.queryDefinition?.selectedFields?.length &&
      !mapped.queryDefinition?.selectedFields?.length
        ? shell.queryDefinition
        : mapped.queryDefinition ?? shell.queryDefinition,
  };
}

async function hydrateWithAllotments(dashboard: ReportDashboard): Promise<ReportDashboard> {
  const backendId = parseBackendDashboardId(dashboard.id);
  if (backendId == null) return dashboard;
  try {
    const allotments = await fetchReportDashboardAllotments({
      page: 0,
      size: 200,
      dashboardId: { equals: backendId },
      isActiveEquals: true,
    });
    if (!allotments.length) return dashboard;
    return {
      ...dashboard,
      layout: mergeAllotmentsIntoLayout(allotments, dashboard.layout, null),
    };
  } catch {
    return dashboard;
  }
}

async function cleanupDashboardLinks(dashboard: ReportDashboard): Promise<void> {
  const allotmentIds = new Set(collectAllotmentIdsFromLayout(dashboard.layout));
  const reportIds = new Set(collectReportIdsFromLayout(dashboard.layout));
  const backendId = parseBackendDashboardId(dashboard.id);

  if (backendId != null) {
    try {
      const remote = await fetchReportDashboardAllotments({
        page: 0,
        size: 500,
        dashboardId: { equals: backendId },
      });
      for (const item of remote) {
        if (item?.id != null) allotmentIds.add(item.id);
        if (item?.report?.id != null) reportIds.add(item.report.id);
      }
    } catch {
      // best-effort
    }
  }

  await Promise.all(
    [...allotmentIds].map(async (id) => {
      try {
        await deleteReportDashboardAllotment(id);
      } catch {
        // ignore
      }
    }),
  );

  await Promise.all(
    [...reportIds].map(async (id) => {
      try {
        await deleteSavedReport(id);
      } catch {
        // ignore
      }
    }),
  );
}

/**
 * Репозиторий:
 * - POST /dashboards = report definition
 * - PUT /dashboards/{id} = { dataForUpdate: { name, visibility, definition } }
 * - layout/access/description — клиентский кэш (localStorage), т.к. definition в API = query.
 */
export const localDashboardRepository: DashboardRepository = {
  async list() {
    const cache = readCache();
    try {
      const remote = await fetchDashboards();
      const mapped = await Promise.all(
        remote.map(async (dto) => {
          const base = mapBackendDashboardToReportDashboard(
            dto,
            shellFromCache(String(dto.id), cache),
          );
          return hydrateWithAllotments(base);
        }),
      );
      const items = sortByUpdatedAt(mapped);
      writeCache(items);
      return items;
    } catch (error) {
      if (cache.length) return sortByUpdatedAt(cache);
      throw error;
    }
  },

  async getById(id) {
    const cache = readCache();
    const backendId = parseBackendDashboardId(id);
    if (backendId != null) {
      try {
        const dto = await fetchDashboardById(backendId);
        const mapped = await hydrateWithAllotments(
          mapBackendDashboardToReportDashboard(dto, shellFromCache(id, cache)),
        );
        writeCache(sortByUpdatedAt([...cache.filter((item) => item.id !== id), mapped]));
        return mapped;
      } catch {
        // fallback
      }
    }
    return cache.find((item) => item.id === id) ?? null;
  },

  async save(dashboard) {
    const backendId = parseBackendDashboardId(dashboard.id);
    const visibility = dashboard.visibility || 'private';
    const name = dashboard.name.trim();
    const description = dashboard.description.trim();
    const definition = resolveDashboardQueryDefinition(dashboard);

    let saved: ReportDashboard;

    if (backendId != null) {
      const dto = await updateDashboardRequest(backendId, {
        dataForUpdate: {
          name,
          visibility,
          definition,
          ...(description ? { description } : {}),
        },
      });
      saved = mergeClientShell(mapBackendDashboardToReportDashboard(dto), dashboard);
      saved = {
        ...saved,
        name: name || saved.name,
        description: description || saved.description,
        layout: dashboard.layout,
        access: dashboard.access,
        visibility,
        queryDefinition: definition,
      };
    } else {
      // POST: name + visibility + definition («Описание» в 400 = definition)
      // текстовое description из UI — опционально
      const dto = await createDashboardRequest({
        name,
        visibility,
        definition,
        ...(description ? { description } : {}),
      });
      saved = {
        ...mergeClientShell(mapBackendDashboardToReportDashboard(dto), dashboard),
        name: name || mapBackendDashboardToReportDashboard(dto).name,
        description: description || dto.description || dashboard.description,
        layout: dashboard.layout,
        access: dashboard.access,
        visibility,
        queryDefinition: definition,
      };
    }

    const cache = readCache().filter(
      (item) => item.id !== dashboard.id && item.id !== saved.id,
    );
    writeCache(sortByUpdatedAt([...cache, saved]));
    return saved;
  },

  async remove(id) {
    const current =
      readCache().find((item) => item.id === id) ??
      (await this.getById(id).catch((): null => null));
    if (current) {
      await cleanupDashboardLinks(current);
    }

    const backendId = parseBackendDashboardId(id);
    if (backendId != null) {
      await deleteDashboardRequest(backendId);
    }
    writeCache(readCache().filter((item) => item.id !== id));
  },
};
