import { create } from 'zustand';

import { appStore } from '@shared/model/app_store/AppStore';

import { localDashboardRepository } from '../api/dashboardRepository';
import { createDashboardLayout } from '../lib/dashboardLayout';
import type {
  DashboardAccessEntry,
  DashboardAccessLevel,
  DashboardLayout,
  DashboardWidgetBinding,
  ReportDashboard,
  ReportsWorkspaceTab,
} from '../types';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function currentUser(): { id: number; label: string } | null {
  const authId = Number(appStore.getState().authId);
  if (!Number.isFinite(authId) || authId <= 0) return null;
  return { id: authId, label: `ID ${authId}` };
}

function canAccess(dashboard: ReportDashboard, userId: number): boolean {
  if (dashboard.ownerUserId === userId) return true;
  return dashboard.access.some((entry) => entry.userId === userId);
}

function accessLevelFor(
  dashboard: ReportDashboard,
  userId: number,
): DashboardAccessLevel | 'owner' | null {
  if (dashboard.ownerUserId === userId) return 'owner';
  return dashboard.access.find((entry) => entry.userId === userId)?.level ?? null;
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
    const now = new Date().toISOString();
    const dashboard: ReportDashboard = {
      id: createId('dashboard'),
      name: name.trim() || 'Новый дашборд',
      description: description.trim(),
      ownerUserId: user.id,
      ownerLabel: user.label,
      createdAt: now,
      updatedAt: now,
      layout: createDashboardLayout('fixed_2x2'),
      access: [],
    };
    await localDashboardRepository.save(dashboard);
    await get().loadList();
    set({ selectedId: dashboard.id, editorOpen: true });
    return dashboard;
  },

  updateDashboardMeta: async (id, patch) => {
    const current = await localDashboardRepository.getById(id);
    if (!current) return;
    const next: ReportDashboard = {
      ...current,
      name: patch.name?.trim() ? patch.name.trim() : current.name,
      description:
        patch.description !== undefined ? patch.description.trim() : current.description,
      updatedAt: new Date().toISOString(),
    };
    await localDashboardRepository.save(next);
    await get().loadList();
  },

  updateDashboardLayout: async (id, layout) => {
    const current = await localDashboardRepository.getById(id);
    if (!current) return;
    const next: ReportDashboard = {
      ...current,
      layout,
      updatedAt: new Date().toISOString(),
    };
    await localDashboardRepository.save(next);
    await get().loadList();
  },

  setCellWidget: async (dashboardId, cellId, widget) => {
    const current = await localDashboardRepository.getById(dashboardId);
    if (!current) return;
    const next: ReportDashboard = {
      ...current,
      updatedAt: new Date().toISOString(),
      layout: {
        ...current.layout,
        cells: current.layout.cells.map((cell) =>
          cell.id === cellId ? { ...cell, widget } : cell,
        ),
      },
    };
    await localDashboardRepository.save(next);
    await get().loadList();
  },

  setAccessList: async (dashboardId, access) => {
    const current = await localDashboardRepository.getById(dashboardId);
    if (!current) return;
    const next: ReportDashboard = {
      ...current,
      access,
      updatedAt: new Date().toISOString(),
    };
    await localDashboardRepository.save(next);
    await get().loadList();
  },

  deleteDashboard: async (id) => {
    await localDashboardRepository.remove(id);
    const { selectedId } = get();
    if (selectedId === id) {
      set({ selectedId: null, editorOpen: false });
    }
    await get().loadList();
  },
}));
