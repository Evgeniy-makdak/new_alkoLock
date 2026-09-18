import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportChartSpec } from '../types/chartSpec';
import type { ReportQueryRequest, ReportViewMode } from '../types/reportApiTypes';

/** Уровень доступа к дашборду (клиентская модель до появления API). */
export type DashboardAccessLevel = 'view' | 'edit' | 'manage';

export type DashboardAccessEntry = {
  userId: number;
  userLabel: string;
  level: DashboardAccessLevel;
};

/**
 * Виджет ячейки — снимок уже сформированного отчёта (query context),
 * чтобы дашборд мог перезапустить запрос независимо от текущего черновика формы.
 */
export type DashboardWidgetBinding = {
  title: string;
  entityName: string;
  body: ReportQueryRequest;
  branchIds?: number[];
  columnHeaderLabels?: Record<string, string>;
  branchOffices?: Values;
  preferredViewMode: ReportViewMode;
  /** Настройки графика; нужны, если preferredViewMode === 'chart'. */
  chartSpec?: ReportChartSpec;
};

export type DashboardCell = {
  id: string;
  /** 0-based */
  row: number;
  /** 0-based */
  col: number;
  widget: DashboardWidgetBinding | null;
};

export type DashboardLayoutPreset = 'fixed_2x2' | 'custom';

export type DashboardLayout = {
  preset: DashboardLayoutPreset;
  rows: number;
  cols: number;
  cells: DashboardCell[];
};

export type ReportDashboard = {
  id: string;
  name: string;
  description: string;
  ownerUserId: number;
  ownerLabel: string;
  createdAt: string;
  updatedAt: string;
  layout: DashboardLayout;
  access: DashboardAccessEntry[];
};

export type ReportDashboardDraft = {
  name: string;
  description: string;
  layout: DashboardLayout;
  access: DashboardAccessEntry[];
};

export type ReportsWorkspaceTab = 'reports' | 'dashboards';
