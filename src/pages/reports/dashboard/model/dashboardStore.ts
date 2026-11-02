import { create } from 'zustand';

import { appStore } from '@shared/model/app_store/AppStore';

import {
  createReportDashboardAllotment,
  deleteReportDashboardAllotment,
} from '../api/reportDashboardAllotmentsApi';
import { localDashboardRepository } from '../api/dashboardRepository';
import {
  grantReportAccess,
  mapAccessLevelToPermission,
} from '../api/reportAccessesApi';
import {
  deleteSavedReport,
  saveReportForEntity,
  updateSavedReport,
} from '../api/savedReportsApi';
import { createDashboardLayout } from '../lib/dashboardLayout';
import {
  buildAllotmentDefinitionFromWidget,
  collectReportIdsFromLayout,
  parseBackendDashboardId,
} from '../lib/mapAllotmentToWidget';
import type {
  DashboardAccessEntry,
  DashboardAccessLevel,
  DashboardLayout,
  DashboardWidgetBinding,
  ReportDashboard,
  ReportsWorkspaceTab,
} from '../types';

function currentUser(): { id: number; label: string } | null {
  const authId = Number(appStore.getState().authId);
  if (!Number.isFinite(authId) || authId <= 0) return null;
  return { id: authId, label: `ID ${authId}` };
}

function canAccess(dashboard: ReportDashboard, userId: number): boolean {
  if (dashboard.ownerUserId === userId) return true;
  if (dashboard.access.some((entry) => entry.userId === userId)) return true;
  // Список с бэка уже отфильтрован сервером; owner может быть не раскрыт в DTO.
  if (parseBackendDashboardId(dashboard.id) != null) return true;
  return false;
}

function accessLevelFor(
  dashboard: ReportDashboard,
  userId: number,
): DashboardAccessLevel | 'owner' | null {
  if (dashboard.ownerUserId === userId) return 'owner';
  return dashboard.access.find((entry) => entry.userId === userId)?.level ?? null;
}

async function persistReportForWidget(
  widget: DashboardWidgetBinding,
): Promise<DashboardWidgetBinding> {
  const definition = buildAllotmentDefinitionFromWidget(widget);
  const name = widget.title?.trim() || widget.entityName;
  const body = { name, definition, visibility: 'private' };

  if (widget.reportId != null) {
    try {
      const updated = await updateSavedReport(widget.reportId, body);
      return {
        ...widget,
        reportId: updated.id ?? widget.reportId,
        title: updated.name || widget.title,
        entityName: updated.entityName?.trim() || widget.entityName,
      };
    } catch {
      // если PUT не принял — создаём новый
    }
  }

  const saved = await saveReportForEntity(widget.entityName, body);
  return {
    ...widget,
    reportId: saved.id,
    title: saved.name || widget.title,
    entityName: saved.entityName?.trim() || widget.entityName,
  };
}

async function syncReportAccesses(
  dashboard: ReportDashboard,
  access: DashboardAccessEntry[],
): Promise<void> {
  const reportIds = collectReportIdsFromLayout(dashboard.layout);
  if (!reportIds.length || !access.length) return;

  await Promise.all(
    reportIds.flatMap((reportId) =>
      access.map(async (entry) => {
        try {
          await grantReportAccess(reportId, {
            userId: entry.userId,
            permission: mapAccessLevelToPermission(entry.level),
          });
        } catch {
          // ACL отчётов — best-effort; основная оболочка уже в dashboard.definition
        }
      }),
    ),
  );
}

type DashboardState = {
  workspaceTab: ReportsWorkspaceTab;
  setWorkspaceTab: (tab: ReportsWorkspaceTab) => void;
  items: ReportDashboard[];
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  editorOpen: boolean;
  loadList: () => Promise<void>;
  openCreateEditor: () => void;
  openEditEditor: (id: string) => void;
  closeEditor: () => void;
  selectedDashboard: () => ReportDashboard | null;
  createDashboard: (name: string, description?: string) => Promise<ReportDashboard | null>;
  updateDashboardMeta: (id: string, patch: { name?: string; description?: string }) => Promise<void>;
  updateDashboardLayout: (id: string, layout: DashboardLayout) => Promise<void>;
  setCellWidget: (
    dashboardId: string,
    cellId: string,
    widget: DashboardWidgetBinding | null,
  ) => Promise<void>;
  setAccessList: (dashboardId: string, access: DashboardAccessEntry[]) => Promise<void>;
  deleteDashboard: (id: string) => Promise<void>;
  currentAccessLevel: (dashboard: ReportDashboard) => DashboardAccessLevel | 'owner' | null;
};

export const dashboardStore = create<DashboardState>((set, get) => ({
  workspaceTab: 'reports',
  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  items: [],
  loading: false,
  error: null,
  selectedId: null,
  editorOpen: false,

  selectedDashboard: () => {
    const { items, selectedId } = get();
    if (!selectedId) return null;
    return items.find((item) => item.id === selectedId) ?? null;
  },

  currentAccessLevel: (dashboard) => {
    const user = currentUser();
    if (!user) return null;
    return accessLevelFor(dashboard, user.id);
  },

  loadList: async () => {
    set({ loading: true, error: null });
    try {
      const user = currentUser();
      const all = await localDashboardRepository.list();
      const items = user ? all.filter((item) => canAccess(item, user.id)) : all;
      set({ items, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load dashboards',
      });
    }
  },

  openCreateEditor: () => {
    set({ selectedId: null, editorOpen: true });
  },

  openEditEditor: (id) => {
    set({ selectedId: id, editorOpen: true });
  },

  closeEditor: () => {
    set({ editorOpen: false });
  },

  createDashboard: async (name, description = '') => {
    const user = currentUser();
    if (!user) {
      set({ error: 'User is not authenticated' });
      return null;
    }
    set({ error: null });
    const now = new Date().toISOString();
    const draft: ReportDashboard = {
      // временный id — repository.save без numeric id: POST definition → PUT name
      id: `new-${Date.now()}`,
      name: name.trim() || 'Новый дашборд',
      description: description.trim(),
      ownerUserId: user.id,
      ownerLabel: user.label,
      createdAt: now,
      updatedAt: now,
      layout: createDashboardLayout('fixed_2x2'),
      access: [],
      visibility: 'private',
      queryDefinition: { selectedFields: [], filters: [] },
    };
    try {
      const saved = await localDashboardRepository.save(draft);
      await get().loadList();
      set({ selectedId: saved.id, editorOpen: true });
      return saved;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create dashboard',
      });
      return null;
    }
  },

  updateDashboardMeta: async (id, patch) => {
    const current = await localDashboardRepository.getById(id);
    if (!current) return;
    set({ error: null });
    try {
      await localDashboardRepository.save({
        ...current,
        name: patch.name?.trim() ? patch.name.trim() : current.name,
        description:
          patch.description !== undefined ? patch.description.trim() : current.description,
        updatedAt: new Date().toISOString(),
      });
      await get().loadList();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update dashboard',
      });
    }
  },

  updateDashboardLayout: async (id, layout) => {
    const current = await localDashboardRepository.getById(id);
    if (!current) return;
    set({ error: null });
    try {
      await localDashboardRepository.save({
        ...current,
        layout,
        updatedAt: new Date().toISOString(),
      });
      await get().loadList();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update dashboard layout',
      });
    }
  },

  setCellWidget: async (dashboardId, cellId, widget) => {
    const current = await localDashboardRepository.getById(dashboardId);
    if (!current) return;

    const prevCell = current.layout.cells.find((cell) => cell.id === cellId);
    const prevWidget = prevCell?.widget ?? null;
    set({ error: null });

    if (!widget) {
      if (prevWidget?.allotmentId != null) {
        try {
          await deleteReportDashboardAllotment(prevWidget.allotmentId);
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to delete report-dashboard-allotment',
          });
          return;
        }
      }
      if (prevWidget?.reportId != null) {
        try {
          await deleteSavedReport(prevWidget.reportId);
        } catch {
          // отчёт мог быть общим — не блокируем отвязку
        }
      }
      try {
        await localDashboardRepository.save({
          ...current,
          updatedAt: new Date().toISOString(),
          layout: {
            ...current.layout,
            cells: current.layout.cells.map((cell) =>
              cell.id === cellId ? { ...cell, widget: null } : cell,
            ),
          },
        });
        await get().loadList();
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to update dashboard',
        });
      }
      return;
    }

    // Замена: снимаем старое назначение/отчёт.
    if (prevWidget?.allotmentId != null && prevWidget.allotmentId !== widget.allotmentId) {
      try {
        await deleteReportDashboardAllotment(prevWidget.allotmentId);
      } catch {
        // continue
      }
    }
    if (
      prevWidget?.reportId != null &&
      prevWidget.reportId !== widget.reportId
    ) {
      try {
        await deleteSavedReport(prevWidget.reportId);
      } catch {
        // continue
      }
    }

    let boundWidget: DashboardWidgetBinding = { ...widget };
    try {
      boundWidget = await persistReportForWidget(boundWidget);

      const backendDashboardId = parseBackendDashboardId(dashboardId);
      const reportId = boundWidget.reportId;
      if (reportId == null || backendDashboardId == null) {
        throw new Error('Report id or dashboard id is missing for allotment');
      }

      const created = await createReportDashboardAllotment({
        reportId,
        dashboardId: backendDashboardId,
      });
      const allotment =
        created.find((item) => item.dashboard?.id === backendDashboardId) ?? created[0];

      if (allotment?.id != null) {
        boundWidget = {
          ...boundWidget,
          allotmentId: allotment.id,
          reportId: allotment.report?.id ?? boundWidget.reportId,
          title: boundWidget.title || allotment.report?.name || boundWidget.entityName,
          entityName:
            allotment.report?.entityName?.trim() ||
            boundWidget.entityName ||
            allotment.report?.name ||
            boundWidget.entityName,
        };
      }
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save report / create allotment',
      });
      return;
    }

    try {
      const nextLayout = {
        ...current.layout,
        cells: current.layout.cells.map((cell) =>
          cell.id === cellId ? { ...cell, widget: boundWidget } : cell,
        ),
      };
      const saved = await localDashboardRepository.save({
        ...current,
        updatedAt: new Date().toISOString(),
        layout: nextLayout,
        // PUT dataForUpdate.definition — definition привязанного отчёта
        queryDefinition: buildAllotmentDefinitionFromWidget(boundWidget),
      });
      if (get().selectedId === dashboardId && saved.id !== dashboardId) {
        set({ selectedId: saved.id });
      }
      await get().loadList();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update dashboard',
      });
    }
  },

  setAccessList: async (dashboardId, access) => {
    const current = await localDashboardRepository.getById(dashboardId);
    if (!current) return;
    set({ error: null });
    try {
      const next: ReportDashboard = {
        ...current,
        access,
        updatedAt: new Date().toISOString(),
      };
      await localDashboardRepository.save(next);
      await syncReportAccesses(next, access);
      await get().loadList();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update access',
      });
    }
  },

  deleteDashboard: async (id) => {
    set({ error: null });
    try {
      await localDashboardRepository.remove(id);
      const { selectedId } = get();
      if (selectedId === id) {
        set({ selectedId: null, editorOpen: false });
      }
      await get().loadList();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete dashboard',
      });
    }
  },
}));
