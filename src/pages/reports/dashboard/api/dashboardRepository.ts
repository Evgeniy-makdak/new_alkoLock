import type { ReportDashboard } from '../types';

const STORAGE_KEY = 'alkoLock.reports.dashboards.v1';

export type DashboardRepository = {
  list: () => Promise<ReportDashboard[]>;
  getById: (id: string) => Promise<ReportDashboard | null>;
  save: (dashboard: ReportDashboard) => Promise<ReportDashboard>;
  remove: (id: string) => Promise<void>;
};

function readAll(): ReportDashboard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ReportDashboard[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: ReportDashboard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Локальный репозиторий. Когда появится API — заменить реализацию,
 * сохранив этот контракт (list/getById/save/remove).
 */
export const localDashboardRepository: DashboardRepository = {
  async list() {
    return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async getById(id) {
    return readAll().find((item) => item.id === id) ?? null;
  },
  async save(dashboard) {
    const items = readAll();
    const index = items.findIndex((item) => item.id === dashboard.id);
    if (index >= 0) {
      items[index] = dashboard;
    } else {
      items.push(dashboard);
    }
    writeAll(items);
    return dashboard;
  },
  async remove(id) {
    writeAll(readAll().filter((item) => item.id !== id));
  },
};
