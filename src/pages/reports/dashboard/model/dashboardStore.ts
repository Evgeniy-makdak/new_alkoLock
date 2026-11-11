import { create } from 'zustand';

import { appStore } from '@shared/model/app_store/AppStore';

import {
  createReportDashboardAllotment,
  deleteReportDashboardAllotment,
} from '../api/reportDashboardAllotmentsApi';
import { localDashboardRepository } from '../api/dashboardRepository';
import {
  grantDashboardAccess,
  revokeDashboardAccess,
} from '../api/dashboardAccessesApi';
import {
  isDuplicateReportNameError,
  saveReportForEntity,
} from '../api/savedReportsApi';
import { packWidgetsIntoLayout } from '../lib/dashboardLayout';
import {
  buildAllotmentDefinitionFromWidget,
  buildLayoutFromWidgets,
  parseBackendDashboardId,
} from '../lib/mapAllotmentToWidget';
import type {
  DashboardAccessEntry,
  DashboardAccessLevel,
  DashboardLayout,
  DashboardLayoutPreset,
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

type LayoutPreference = { preset: DashboardLayoutPreset; rows: number; cols: number };

/** Раскладка на бэке не хранится — выбранный размер сетки держим в сторе на сессию. */
function applyLayoutPreference(
  dashboard: ReportDashboard,
  preference: LayoutPreference | undefined,
): ReportDashboard {
  if (!preference) return dashboard;
  const widgets = dashboard.layout.cells.map((cell) => cell.widget);
  return {
    ...dashboard,
    layout: packWidgetsIntoLayout(widgets, preference.rows, preference.cols, preference.preset),
  };
}


function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Права на дашборд → бэк: отозвать убранных, выдать добавленным и изменённым. */
async function syncDashboardAccesses(
  dashboardId: number,
  previous: DashboardAccessEntry[],
  next: DashboardAccessEntry[],
): Promise<void> {
  const nextByUser = new Map(next.map((entry) => [entry.userId, entry]));
  const revokeIds = previous
    .filter((entry) => !nextByUser.has(entry.userId))
    .map((entry) => entry.userId);
  const previousByUser = new Map(previous.map((entry) => [entry.userId, entry]));
  const grants = next
    .filter((entry) => previousByUser.get(entry.userId)?.level !== entry.level)
    .map((entry) => ({ userId: entry.userId, level: entry.level }));

  await revokeDashboardAccess(dashboardId, revokeIds);
  await grantDashboardAccess(dashboardId, grants);
}

type DashboardState = {
  workspaceTab: ReportsWorkspaceTab;
  setWorkspaceTab: (tab: ReportsWorkspaceTab) => void;
  items: ReportDashboard[];
  /** Выбранная пользователем сетка (id дашборда → размер), пока открыта вкладка. */
  layoutPreferences: Record<string, LayoutPreference>;
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
  /** Сменить размер сетки (только в сторе — бэк раскладку не хранит). */
  updateDashboardLayout: (id: string, layout: DashboardLayout) => Promise<void>;
  /** Снять виджет с ячейки: удаляется только привязка к дашборду, сам отчёт остаётся. */
  removeCellWidget: (dashboardId: string, cellId: string) => Promise<void>;
  /** Привязать существующий отчёт к дашборду. @returns текст ошибки или null при успехе. */
  linkReportToDashboard: (dashboardId: string, reportId: number) => Promise<string | null>;
  /** Сохранить отчёт под именем и привязать к дашборду. @returns текст ошибки или null. */
  saveReportAndLink: (
    dashboardId: string,
    widget: DashboardWidgetBinding,
    name: string,
  ) => Promise<string | null>;
  /** @returns true, если права сохранены на бэке. */
  setAccessList: (dashboardId: string, access: DashboardAccessEntry[]) => Promise<boolean>;
  /** Отозвать право одного пользователя на дашборд. @returns true при успехе. */
  revokeAccess: (dashboardId: string, userId: number) => Promise<boolean>;
  deleteDashboard: (id: string) => Promise<void>;
  currentAccessLevel: (dashboard: ReportDashboard) => DashboardAccessLevel | 'owner' | null;
};

export const dashboardStore = create<DashboardState>((set, get) => ({
  workspaceTab: 'reports',
  setWorkspaceTab: (tab) => set({ workspaceTab: tab }),
  items: [],
  layoutPreferences: {},
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
      const filtered = user ? all.filter((item) => canAccess(item, user.id)) : all;
      const { layoutPreferences } = get();
      const items = filtered.map((item) => applyLayoutPreference(item, layoutPreferences[item.id]));
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
      // временный id — repository.save без numeric id создаёт дашборд через POST
      id: `new-${Date.now()}`,
      name: name.trim() || 'Новый дашборд',
      description: description.trim(),
      ownerUserId: user.id,
      ownerLabel: user.label,
      createdAt: now,
      updatedAt: now,
      layout: buildLayoutFromWidgets([]),
      access: [],
      visibility: 'private',
    };
    try {
      const saved = await localDashboardRepository.save(draft);
      set((state) => ({
        layoutPreferences: {
          ...state.layoutPreferences,
          [saved.id]: { preset: 'fixed_2x2', rows: 2, cols: 2 },
        },
      }));
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
    const preference: LayoutPreference = {
      preset: layout.preset,
      rows: layout.rows,
      cols: layout.cols,
    };
    set((state) => ({
      layoutPreferences: { ...state.layoutPreferences, [id]: preference },
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              layout,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
      error: null,
    }));
  },

  removeCellWidget: async (dashboardId, cellId) => {
    const current = await localDashboardRepository.getById(dashboardId);
    if (!current) return;
    const widget = current.layout.cells.find((cell) => cell.id === cellId)?.widget ?? null;
    set({ error: null });
    try {
      if (widget?.allotmentId != null) {
        await deleteReportDashboardAllotment(widget.allotmentId);
      }
      // раскладка строится из привязок бэка — достаточно перечитать список
      await get().loadList();
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to delete report-dashboard-allotment') });
    }
  },

  linkReportToDashboard: async (dashboardId, reportId) => {
    const backendDashboardId = parseBackendDashboardId(dashboardId);
    if (backendDashboardId == null) return 'Dashboard id is missing';
    try {
      await createReportDashboardAllotment({ reportId, dashboardId: backendDashboardId });
      await get().loadList();
      return null;
    } catch (error) {
      return errorMessage(error, 'Failed to create report-dashboard-allotment');
    }
  },

  saveReportAndLink: async (dashboardId, widget, name) => {
    const trimmed = name.trim();
    if (!trimmed) return 'Введите название отчёта';
    let reportId: number;
    try {
      const saved = await saveReportForEntity(widget.entityName, {
        name: trimmed,
        definition: buildAllotmentDefinitionFromWidget(widget),
        visibility: 'private',
      });
      reportId = saved.id;
    } catch (error) {
      if (isDuplicateReportNameError(error)) {
        return `Отчёт с названием «${trimmed}» уже существует. Укажите другое название или выберите его из сохранённых.`;
      }
      return errorMessage(error, 'Failed to save report');
    }
    return get().linkReportToDashboard(dashboardId, reportId);
  },

  setAccessList: async (dashboardId, access) => {
    const backendId = parseBackendDashboardId(dashboardId);
    if (backendId == null) return false;
    const current = await localDashboardRepository.getById(dashboardId);
    if (!current) return false;
    set({ error: null });
    try {
      await syncDashboardAccesses(backendId, current.access, access);
      await get().loadList();
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update access',
      });
      return false;
    }
  },

  revokeAccess: async (dashboardId, userId) => {
    const backendId = parseBackendDashboardId(dashboardId);
    if (backendId == null) return false;
    set({ error: null });
    try {
      await revokeDashboardAccess(backendId, [userId]);
      await get().loadList();
      return true;
    } catch (error) {
      set({ error: errorMessage(error, 'Failed to revoke access') });
      return false;
    }
  },

  deleteDashboard: async (id) => {
    set({ error: null });
    try {
      await localDashboardRepository.remove(id);
      const { selectedId, layoutPreferences } = get();
      const nextPrefs = { ...layoutPreferences };
      delete nextPrefs[id];
      set({ layoutPreferences: nextPrefs });
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
