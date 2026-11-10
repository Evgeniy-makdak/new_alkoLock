import {
  allotmentToWidgetBinding,
  buildLayoutFromWidgets,
  collectAllotmentIdsFromLayout,
  mapBackendDashboardToReportDashboard,
  parseBackendDashboardId,
} from '../lib/mapAllotmentToWidget';
import { encodeDashboardDescription } from '../lib/dashboardDescription';
import type {
  BackendDashboardDto,
  DashboardAccessEntry,
  DashboardWidgetBinding,
  ReportDashboard,
  ReportDashboardAllotment,
} from '../types';
import { fetchDashboardAccesses } from './dashboardAccessesApi';
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

export type DashboardRepository = {
  list: () => Promise<ReportDashboard[]>;
  getById: (id: string) => Promise<ReportDashboard | null>;
  save: (dashboard: ReportDashboard) => Promise<ReportDashboard>;
  remove: (id: string) => Promise<void>;
};

function sortByUpdatedAt(items: ReportDashboard[]): ReportDashboard[] {
  return [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Раскладка (из привязок отчётов) и права дашборда — только из ответов бэка. */
async function hydrateDashboard(dto: BackendDashboardDto): Promise<ReportDashboard> {
  const mapped = mapBackendDashboardToReportDashboard(dto);
  const backendId = parseBackendDashboardId(mapped.id);
  if (backendId == null) return mapped;

  const [allotments, access] = await Promise.all([
    fetchReportDashboardAllotments({
      page: 0,
      size: 200,
      dashboardId: { equals: backendId },
      isActiveEquals: true,
    })
      .catch((): ReportDashboardAllotment[] => []),
    fetchDashboardAccesses(backendId).catch((): DashboardAccessEntry[] => []),
  ]);

  const widgets: DashboardWidgetBinding[] = [];
  for (const allotment of [...allotments].sort((a, b) => a.id - b.id)) {
    const widget = allotmentToWidgetBinding(allotment);
    if (widget) widgets.push(widget);
  }

  return {
    ...mapped,
    layout: buildLayoutFromWidgets(widgets),
    // владелец отображается отдельно, в «дополнительных» пользователях его быть не должно
    access: access.filter((entry) => entry.userId !== mapped.ownerUserId),
  };
}

/** Снимает привязки отчётов дашборда. Сами отчёты остаются — они могут быть на других дашбордах. */
async function removeDashboardAllotments(dashboard: ReportDashboard): Promise<void> {
  const allotmentIds = new Set(collectAllotmentIdsFromLayout(dashboard.layout));
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
}

/**
 * Репозиторий поверх API бэка (без localStorage):
 * - dashboards: name, visibility, definition (= «Описание дашборда»);
 * - report-dashboard-allotments: привязанные отчёты → ячейки сетки;
 * - dashboard-accesses: права пользователей.
 */
export const localDashboardRepository: DashboardRepository = {
  async list() {
    const remote = await fetchDashboards();
    const items = await Promise.all(remote.map((dto) => hydrateDashboard(dto)));
    return sortByUpdatedAt(items);
  },

  async getById(id) {
    const backendId = parseBackendDashboardId(id);
    if (backendId == null) return null;
    try {
      return await hydrateDashboard(await fetchDashboardById(backendId));
    } catch {
      return null;
    }
  },

  async save(dashboard) {
    const backendId = parseBackendDashboardId(dashboard.id);
    const visibility = dashboard.visibility || 'private';
    const name = dashboard.name.trim();
    const description = dashboard.description.trim();
    const definition = encodeDashboardDescription(description);

    if (backendId != null) {
      const dto = await updateDashboardRequest(backendId, {
        dataForUpdate: { name, visibility, definition },
      });
      const mapped = mapBackendDashboardToReportDashboard(dto, {
        layout: dashboard.layout,
        access: dashboard.access,
      });
      return {
        ...mapped,
        // PUT-ответ может не содержать id/author — оставляем данные сохраняемого дашборда
        id: dashboard.id,
        ownerUserId: mapped.ownerUserId || dashboard.ownerUserId,
        ownerLabel: mapped.ownerLabel || dashboard.ownerLabel,
        name: name || mapped.name,
        description,
        visibility,
      };
    }

    // Новый дашборд: POST, затем (если бэк не принял name) PUT с названием.
    const created = await createDashboardRequest({ name, visibility, definition });
    let dto = created;
    if (created.id != null && (created.name ?? '').trim() !== name) {
      dto = await updateDashboardRequest(created.id, {
        dataForUpdate: { name, visibility, definition },
      });
    }
    const mapped = mapBackendDashboardToReportDashboard(dto.id != null ? dto : created, {
      layout: dashboard.layout,
      access: dashboard.access,
    });
    return {
      ...mapped,
      id: String(created.id ?? mapped.id),
      name: name || mapped.name,
      description,
      visibility,
    };
  },

  async remove(id) {
    const current = await this.getById(id);
    if (current) {
      await removeDashboardAllotments(current);
    }
    const backendId = parseBackendDashboardId(id);
    if (backendId != null) {
      await deleteDashboardRequest(backendId);
    }
  },
};
