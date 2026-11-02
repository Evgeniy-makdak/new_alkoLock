import type { ReportQueryRequest } from '../../types/reportApiTypes';
import type {
  BackendDashboardDto,
  DashboardAccessEntry,
  DashboardClientDefinitionV1,
  DashboardLayout,
  DashboardWidgetBinding,
  ReportDashboard,
  ReportDashboardAllotment,
  ReportDashboardAllotmentDefinition,
  ReportDashboardAllotmentPageableDto,
} from '../types';
import { createDashboardLayout, resizeDashboardLayout } from './dashboardLayout';

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

export function allotmentToWidgetBinding(
  allotment: ReportDashboardAllotment,
  prev?: DashboardWidgetBinding | null,
): DashboardWidgetBinding | null {
  const definition = allotment.report?.definition;
  const body = allotmentDefinitionToQueryRequest(definition) ?? prev?.body;
  if (!body) return null;

  const entityName =
    allotment.report?.entityName?.trim() ||
    prev?.entityName ||
    allotment.report?.name?.trim() ||
    'Report';

  return {
    title: prev?.title || allotment.report?.name || entityName,
    entityName,
    body,
    branchIds: prev?.branchIds,
    columnHeaderLabels: prev?.columnHeaderLabels,
    branchOffices: prev?.branchOffices,
    preferredViewMode: prev?.preferredViewMode ?? 'table',
    chartSpec: prev?.chartSpec,
    allotmentId: allotment.id,
    reportId: allotment.report?.id,
  };
}

function tryParseLayout(value: unknown): DashboardLayout | null {
  if (!isRecord(value)) return null;
  if (
    typeof value.rows !== 'number' ||
    typeof value.cols !== 'number' ||
    !Array.isArray(value.cells)
  ) {
    return null;
  }
  return value as unknown as DashboardLayout;
}

export function parseDashboardClientDefinition(raw: string | null | undefined): {
  description: string;
  layout: DashboardLayout;
  access: DashboardAccessEntry[];
} {
  const fallback = {
    description: '',
    layout: createDashboardLayout('fixed_2x2'),
    access: [] as DashboardAccessEntry[],
  };
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return fallback;

    // v1 envelope
    if (parsed.v === 1 && tryParseLayout(parsed.layout)) {
      const access = Array.isArray(parsed.access)
        ? (parsed.access as DashboardAccessEntry[])
        : [];
      return {
        description: typeof parsed.description === 'string' ? parsed.description : '',
        layout: parsed.layout as DashboardLayout,
        access,
      };
    }

    // legacy: чистый layout
    const layout = tryParseLayout(parsed);
    if (layout) {
      return { description: '', layout, access: [] };
    }
  } catch {
    // ignore
  }
  return fallback;
}

/** Сериализация клиентской оболочки в dashboard.definition. */
export function serializeDashboardClientDefinition(input: {
  description?: string;
  layout: DashboardLayout;
  access?: DashboardAccessEntry[];
}): string {
  const payload: DashboardClientDefinitionV1 = {
    v: 1,
    description: input.description ?? '',
    layout: input.layout,
    access: input.access ?? [],
  };
  return JSON.stringify(payload);
}

/** @deprecated используйте serializeDashboardClientDefinition */
export function serializeDashboardLayoutDefinition(layout: DashboardLayout): string {
  return serializeDashboardClientDefinition({ layout });
}

/** Пустая definition для POST /dashboards (создание оболочки без отчёта). */
export const EMPTY_DASHBOARD_QUERY_DEFINITION: ReportDashboardAllotmentDefinition = {
  selectedFields: [],
  filters: [],
};

export function normalizeBackendDashboardDefinition(
  raw: BackendDashboardDto['definition'],
): ReportDashboardAllotmentDefinition {
  if (raw == null) return { ...EMPTY_DASHBOARD_QUERY_DEFINITION };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (isRecord(parsed) && Array.isArray(parsed.selectedFields)) {
        return parsed as unknown as ReportDashboardAllotmentDefinition;
      }
    } catch {
      // ignore
    }
    return { ...EMPTY_DASHBOARD_QUERY_DEFINITION };
  }
  if (isRecord(raw) && Array.isArray(raw.selectedFields)) {
    return raw as ReportDashboardAllotmentDefinition;
  }
  return { ...EMPTY_DASHBOARD_QUERY_DEFINITION };
}

/**
 * Маппинг DTO → клиентская модель.
 * layout/access/description бэк в definition не хранит — подмешиваются из кэша снаружи.
 */
export function mapBackendDashboardToReportDashboard(
  dto: BackendDashboardDto,
  shell?: {
    description?: string;
    layout?: DashboardLayout;
    access?: DashboardAccessEntry[];
  } | null,
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
    description: dto.description?.trim() || shell?.description || '',
    ownerUserId,
    ownerLabel,
    createdAt: dto.createdAt || now,
    updatedAt: dto.lastModifiedAt || dto.createdAt || now,
    layout: shell?.layout ?? createDashboardLayout('fixed_2x2'),
    access: shell?.access ?? [],
    visibility: dto.visibility || 'private',
    queryDefinition: normalizeBackendDashboardDefinition(dto.definition),
  };
}

/** definition для PUT: явная queryDefinition или первый виджет, иначе пустая. */
export function resolveDashboardQueryDefinition(
  dashboard: ReportDashboard,
): ReportDashboardAllotmentDefinition {
  if (dashboard.queryDefinition?.selectedFields?.length) {
    return dashboard.queryDefinition;
  }
  const widget = dashboard.layout.cells.find((cell) => cell.widget)?.widget;
  if (widget) {
    return buildAllotmentDefinitionFromWidget(widget);
  }
  return dashboard.queryDefinition ?? { ...EMPTY_DASHBOARD_QUERY_DEFINITION };
}

/**
 * Раскладывает allotments по ячейкам: сохраняет позиции из prevLayout по allotmentId,
 * новые — в первую свободную ячейку (при необходимости расширяет сетку).
 */
export function mergeAllotmentsIntoLayout(
  allotments: ReportDashboardAllotment[],
  prevLayout?: DashboardLayout | null,
  dashboardDefinition?: string | null,
): DashboardLayout {
  const fromDefinition = parseDashboardClientDefinition(dashboardDefinition).layout;
  let layout: DashboardLayout = prevLayout ?? fromDefinition ?? createDashboardLayout('fixed_2x2');

  const byAllotmentId = new Map<number, DashboardWidgetBinding>();
  for (const cell of layout.cells) {
    if (cell.widget?.allotmentId != null) {
      byAllotmentId.set(cell.widget.allotmentId, cell.widget);
    }
  }

  const widgets: DashboardWidgetBinding[] = [];
  for (const allotment of allotments) {
    if (!allotment?.id) continue;
    const prev = byAllotmentId.get(allotment.id) ?? null;
    const widget = allotmentToWidgetBinding(allotment, prev);
    if (widget) widgets.push(widget);
  }

  const placedIds = new Set<number>();
  const nextCells = layout.cells.map((cell) => {
    const allotmentId = cell.widget?.allotmentId;
    if (allotmentId == null) {
      // Виджет без allotmentId (ещё только reportId / локальный) — оставляем.
      if (cell.widget && cell.widget.allotmentId == null) return cell;
      return { ...cell, widget: null };
    }
    const match = widgets.find((w) => w.allotmentId === allotmentId);
    if (!match) {
      return { ...cell, widget: null };
    }
    placedIds.add(allotmentId);
    return { ...cell, widget: match };
  });

  layout = { ...layout, cells: nextCells };

  const unplaced = widgets.filter(
    (w) => w.allotmentId != null && !placedIds.has(w.allotmentId),
  );
  for (const widget of unplaced) {
    let emptyIndex = layout.cells.findIndex((cell) => !cell.widget);
    if (emptyIndex < 0) {
      const nextRows = Math.min(6, layout.rows + 1);
      layout = resizeDashboardLayout(layout, nextRows, layout.cols, 'custom');
      emptyIndex = layout.cells.findIndex((cell) => !cell.widget);
    }
    if (emptyIndex < 0) break;
    layout = {
      ...layout,
      cells: layout.cells.map((cell, index) =>
        index === emptyIndex ? { ...cell, widget } : cell,
      ),
    };
  }

  return layout;
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
