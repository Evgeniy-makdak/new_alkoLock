import type { ReportQueryRequest } from '../../types/reportApiTypes';
import type {
  BackendDashboardDto,
  DashboardAccessEntry,
  DashboardCell,
  DashboardLayout,
  DashboardWidgetBinding,
  ReportDashboard,
  ReportDashboardAllotment,
  ReportDashboardAllotmentDefinition,
  ReportDashboardAllotmentPageableDto,
} from '../types';
import { decodeDashboardDescription } from './dashboardDescription';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** definition с бэка → тело query для виджета / executeReportQuery. */
export function allotmentDefinitionToQueryRequest(
  definition: ReportDashboardAllotmentDefinition | ReportQueryRequest | null | undefined,
): ReportQueryRequest | null {
  if (!isRecord(definition)) return null;
  const selectedFields = Array.isArray(definition.selectedFields)
    ? definition.selectedFields
    : [];
  if (!selectedFields.length) return null;

  const body: ReportQueryRequest = {
    selectedFields: selectedFields as ReportQueryRequest['selectedFields'],
    filters: Array.isArray(definition.filters)
      ? (definition.filters as ReportQueryRequest['filters'])
      : [],
  };
  if (Array.isArray(definition.groupBy)) body.groupBy = definition.groupBy as string[];
  if (Array.isArray(definition.having)) {
    body.having = definition.having as ReportQueryRequest['having'];
  }
  if (Array.isArray(definition.havingConnects)) {
    body.havingConnects = definition.havingConnects as ReportQueryRequest['havingConnects'];
  }
  if (Array.isArray(definition.havingGroupConnections)) {
    body.havingGroupConnections =
      definition.havingGroupConnections as ReportQueryRequest['havingGroupConnections'];
  }
  if (Array.isArray(definition.logicConnects)) {
    body.logicConnects = definition.logicConnects as ReportQueryRequest['logicConnects'];
  }
  if (Array.isArray(definition.groupConnections)) {
    body.groupConnections = definition.groupConnections as ReportQueryRequest['groupConnections'];
  }
  return body;
}

export function buildAllotmentDefinitionFromWidget(
  widget: DashboardWidgetBinding,
): ReportDashboardAllotmentDefinition {
  const pageableDto: ReportDashboardAllotmentPageableDto | undefined = undefined;
  return {
    ...widget.body,
    ...(pageableDto ? { pageableDto } : {}),
  };
}

/**
 * Сущность отчёта из ответа бэка: фактически приходит в report.definition.entityName
 * (отдельного поля entityName в ответе нет, хотя Swagger его описывает).
 */
export function resolveReportEntityName(
  report: ReportDashboardAllotment['report'] | null | undefined,
): string {
  const direct = report?.entityName?.trim();
  if (direct) return direct;
  const definition = report?.definition as { entityName?: unknown } | null | undefined;
  return typeof definition?.entityName === 'string' ? definition.entityName.trim() : '';
}

export function allotmentToWidgetBinding(
  allotment: ReportDashboardAllotment,
): DashboardWidgetBinding | null {
  const body = allotmentDefinitionToQueryRequest(allotment.report?.definition);
  if (!body) return null;

  // entityName — только из ответа бэка; имя отчёта — не сущность.
  const entityName = resolveReportEntityName(allotment.report);
  if (!entityName) return null;

  return {
    title: allotment.report?.name?.trim() || entityName,
    entityName,
    body,
    preferredViewMode: 'table',
    allotmentId: allotment.id,
    reportId: allotment.report?.id,
  };
}

const LAYOUT_COLS = 2;
const LAYOUT_MIN_ROWS = 2;
const LAYOUT_MAX_ROWS = 6;

/**
 * Раскладка не хранится на бэке: сетка из 2 столбцов строится по привязанным отчётам
 * (порядок — как отдаёт бэк) и всегда содержит хотя бы одну свободную ячейку.
 */
export function buildLayoutFromWidgets(widgets: DashboardWidgetBinding[]): DashboardLayout {
  const rows = Math.min(
    LAYOUT_MAX_ROWS,
    Math.max(LAYOUT_MIN_ROWS, Math.ceil((widgets.length + 1) / LAYOUT_COLS)),
  );
  const cells: DashboardCell[] = [];
  for (let index = 0; index < rows * LAYOUT_COLS; index += 1) {
    cells.push({
      id: `cell-${index}`,
      row: Math.floor(index / LAYOUT_COLS),
      col: index % LAYOUT_COLS,
      widget: widgets[index] ?? null,
    });
  }
  return {
    preset: rows === LAYOUT_MIN_ROWS ? 'fixed_2x2' : 'custom',
    rows,
    cols: LAYOUT_COLS,
    cells,
  };
}

/**
 * DTO с бэка → клиентская модель.
 * Права и раскладка приходят отдельными запросами (dashboard-accesses, allotments).
 */
export function mapBackendDashboardToReportDashboard(
  dto: BackendDashboardDto,
  extras?: { layout?: DashboardLayout; access?: DashboardAccessEntry[] } | null,
): ReportDashboard {
  const now = new Date().toISOString();
  const author = dto.author;
  const ownerUserId = author?.id ?? 0;
  const ownerLabel =
    author?.fullName ||
    [author?.surname, author?.firstName, author?.middleName].filter(Boolean).join(' ').trim() ||
    author?.login ||
    (ownerUserId ? `ID ${ownerUserId}` : '');

  return {
    id: String(dto.id),
    name: dto.name?.trim() || `Дашборд ${dto.id}`,
    description: decodeDashboardDescription(dto.definition),
    ownerUserId,
    ownerLabel,
    createdAt: dto.createdAt || now,
    updatedAt: dto.lastModifiedAt || dto.createdAt || now,
    layout: extras?.layout ?? buildLayoutFromWidgets([]),
    access: extras?.access ?? [],
    visibility: dto.visibility || 'private',
  };
}

export function collectAllotmentIdsFromLayout(layout: DashboardLayout): number[] {
  const ids: number[] = [];
  for (const cell of layout.cells) {
    const id = cell.widget?.allotmentId;
    if (id != null && Number.isFinite(id)) ids.push(id);
  }
  return ids;
}

export function collectReportIdsFromLayout(layout: DashboardLayout): number[] {
  const ids: number[] = [];
  for (const cell of layout.cells) {
    const id = cell.widget?.reportId;
    if (id != null && Number.isFinite(id)) ids.push(id);
  }
  return ids;
}

export function parseBackendDashboardId(dashboardId: string): number | null {
  if (!/^\d+$/.test(dashboardId)) return null;
  const n = Number(dashboardId);
  return Number.isFinite(n) ? n : null;
}
