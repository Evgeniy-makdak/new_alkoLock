import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportChartSpec } from '../types/chartSpec';
import type {
  ReportHavingFilter,
  ReportHavingGroupConnection,
  ReportLogicConnect,
  ReportQueryFilter,
  ReportQueryRequest,
  ReportSelectedFieldPayload,
  ReportViewMode,
} from '../types/reportApiTypes';

/** Уровень доступа к дашборду: view = READ, edit = WRITE (dashboard-accesses). */
export type DashboardAccessLevel = 'view' | 'edit';

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
  /** ID назначения report↔dashboard на бэке (POST/DELETE allotments). */
  allotmentId?: number;
  /** ID отчёта на бэке (из ответа allotment.report.id). */
  reportId?: number;
};

/** pageableDto из POST /api/v1/report-dashboard-allotments. */
export type ReportDashboardAllotmentPageableDto = {
  limit?: number;
  offset?: number;
  sort?: Array<{ field: string; direction: 'ASC' | 'DESC' | string }>;
};

/**
 * Тело POST /api/v1/report-dashboard-allotments — definition отчёта
 * (как в Swagger) + опциональный pageableDto.
 */
export type ReportDashboardAllotmentDefinition = {
  selectedFields: ReportSelectedFieldPayload[];
  filters: ReportQueryFilter[];
  groupBy?: string[];
  having?: ReportHavingFilter[];
  havingConnects?: ReportLogicConnect[];
  havingGroupConnections?: ReportHavingGroupConnection[];
  logicConnects?: ReportLogicConnect[];
  groupConnections?: ReportHavingGroupConnection[];
  pageableDto?: ReportDashboardAllotmentPageableDto;
};

export type ReportDashboardAllotmentAuthor = {
  id?: number;
  login?: string;
  firstName?: string;
  surname?: string;
  middleName?: string;
  email?: string;
  fullName?: string;
};

export type ReportDashboardAllotmentReport = {
  id: number;
  name?: string;
  definition?: ReportDashboardAllotmentDefinition | ReportQueryRequest | null;
  entityName?: string;
  author?: ReportDashboardAllotmentAuthor | null;
  visibility?: string;
  isActive?: boolean;
  createdAt?: string;
  lastModifiedAt?: string;
};

export type ReportDashboardAllotmentDashboard = {
  id: number;
  name?: string;
  /** «Описание дашборда» (строка). */
  definition?: string | null;
  author?: ReportDashboardAllotmentAuthor | null;
  visibility?: string;
  isActive?: boolean;
  createdAt?: string;
  lastModifiedAt?: string;
};

/** Элемент ответа POST/GET report-dashboard-allotments. */
export type ReportDashboardAllotment = {
  id: number;
  report?: ReportDashboardAllotmentReport | null;
  dashboard?: ReportDashboardAllotmentDashboard | null;
  isActive?: boolean;
  inactiveSince?: string | null;
  createdAt?: string;
  createdBy?: ReportDashboardAllotmentAuthor | null;
};

export type ReportDashboardAllotmentListParams = {
  page?: number;
  size?: number;
  id?: { equals?: number; in?: number[] };
  reportId?: { equals?: number; in?: number[] };
  dashboardId?: { equals?: number; in?: number[] };
  isActiveEquals?: boolean;
};

/** DTO дашборда с GET/POST/PUT /api/v1/dashboards. */
export type BackendDashboardDto = {
  id: number;
  name?: string;
  description?: string;
  /** На бэке — строка «Описание дашборда» (обязательная, не пустая). */
  definition?: string | null;
  author?: ReportDashboardAllotmentAuthor | null;
  visibility?: string;
  isActive?: boolean;
  createdAt?: string;
  lastModifiedAt?: string;
};

/**
 * POST /api/v1/dashboards
 * definition на бэке — String «Описание дашборда» (@NotBlank).
 */
export type BackendDashboardCreateBody = {
  name: string;
  visibility: string;
  definition: string;
};

/** PUT /api/v1/dashboards/{id} — dataForUpdate. */
export type BackendDashboardUpdateBody = {
  dataForUpdate: {
    name: string;
    visibility: string;
    definition: string;
  };
};

/** Тело POST /api/v1/reports/{entityName}/save и PUT /api/v1/reports/{id}. */
export type SavedReportWriteBody = {
  name: string;
  definition: ReportDashboardAllotmentDefinition;
  /** Обязательно на бэке («Область видимости отчёта»). */
  visibility: string;
};

/** Право пользователя на дашборд (/api/v1/dashboard-accesses). */
export type BackendDashboardAccessDto = {
  id?: number;
  dashboard?: { id?: number } | null;
  permission?: 'READ' | 'WRITE' | string | null;
  user?: {
    id?: number;
    email?: string;
    login?: string;
    firstName?: string;
    surname?: string;
    middleName?: string;
    fullName?: string;
  } | null;
  isActive?: boolean;
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
  /** visibility с бэка (PUT dataForUpdate.visibility). */
  visibility?: string;
};

export type ReportDashboardDraft = {
  name: string;
  description: string;
  layout: DashboardLayout;
  access: DashboardAccessEntry[];
};

export type ReportsWorkspaceTab = 'reports' | 'dashboards';
