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
  /** JSON-строка клиентской раскладки или произвольный blob с бэка. */
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
  /**
   * Query-definition отчёта (объект) — по контракту Swagger.
   * Иногда бэк может отдать строку; парсим на клиенте.
   */
  definition?: ReportDashboardAllotmentDefinition | string | null;
  author?: ReportDashboardAllotmentAuthor | null;
  visibility?: string;
  isActive?: boolean;
  createdAt?: string;
  lastModifiedAt?: string;
};

/** POST /api/v1/dashboards — тело = definition отчёта. */
export type BackendDashboardCreateBody = ReportDashboardAllotmentDefinition;

/** PUT /api/v1/dashboards/{id} */
export type BackendDashboardUpdateBody = {
  dataForUpdate: {
    name: string;
    visibility: string;
    definition: ReportDashboardAllotmentDefinition;
  };
};

/** @deprecated используйте BackendDashboardCreateBody / BackendDashboardUpdateBody */
export type BackendDashboardWriteBody = BackendDashboardCreateBody;

/** Тело POST /api/v1/reports/{entityName}/save и PUT /api/v1/reports/{id}. */
export type SavedReportWriteBody = {
  name: string;
  definition: ReportDashboardAllotmentDefinition;
  visibility?: string;
};

/** DTO прав доступа к отчёту (/api/v1/report-accesses). */
export type ReportAccessDto = {
  id?: number;
  report?: { id?: number; name?: string } | null;
  user?: {
    id?: number;
    email?: string;
    firstName?: string;
    surname?: string;
    middleName?: string;
    fullName?: string;
  } | null;
  permission?: string | null;
  accessLevel?: string | null;
};

export type ReportAccessGrantBody = {
  userId: number;
  permission: string;
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

/**
 * Клиентский JSON внутри dashboard.definition.
 * v1: layout + description + access (ACL UI до появления dashboard-accesses).
 */
export type DashboardClientDefinitionV1 = {
  v: 1;
  description?: string;
  layout: DashboardLayout;
  access?: DashboardAccessEntry[];
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
  /**
   * Query-definition дашборда на бэке (POST body / PUT dataForUpdate.definition).
   * Раскладка сетки (layout) хранится клиентски в кэше — в API definition — это отчёт.
   */
  queryDefinition?: ReportDashboardAllotmentDefinition;
};

export type ReportDashboardDraft = {
  name: string;
  description: string;
  layout: DashboardLayout;
  access: DashboardAccessEntry[];
};

export type ReportsWorkspaceTab = 'reports' | 'dashboards';
