import { create } from 'zustand';
import { enqueueSnackbar } from 'notistack';

import { appStore } from '@shared/model/app_store/AppStore';

import {
  reportGenerationStore,
  type ReportQueryContext,
} from '../../model/reportGenerationStore';
import { reportsStore } from '../../model/reportsStore';
import { normalizeReportViewMode } from '../../types/reportApiTypes';
import {
  createReportDashboardAllotment,
  deleteReportDashboardAllotment,
  fetchReportDashboardAllotments,
} from '../api/reportDashboardAllotmentsApi';
import { localDashboardRepository } from '../api/dashboardRepository';
import {
  grantDashboardAccess,
  revokeDashboardAccess,
} from '../api/dashboardAccessesApi';
import {
  deleteSavedReport,
  fetchSavedReportById,
  isDuplicateReportNameError,
  saveReportForEntity,
  updateSavedReport,
} from '../api/savedReportsApi';
import { canFitDashboardWidgets, packWidgetsIntoLayout } from '../lib/dashboardLayout';
import {
  buildAllotmentDefinitionFromWidget,
  buildLayoutFromWidgets,
  parseBackendDashboardId,
} from '../lib/mapAllotmentToWidget';
import {
  applyDashboardColumnHeaderLabelSnapshot,
  type DashboardColumnHeaderLabelSnapshot,
} from '../lib/applyDashboardColumnHeaderLabelSnapshot';
import type {
  DashboardAccessEntry,
  DashboardAccessLevel,
  DashboardLayout,
  DashboardLayoutPreset,
  DashboardWidgetBinding,
  ReportDashboard,
  ReportDashboardAllotment,
  ReportsWorkspaceTab,
} from '../types';

/** Обновить виджеты с данным reportId во всех дашбордах стора. */
function patchWidgetsByReportId(
  items: ReportDashboard[],
  reportId: number,
  patch: Partial<DashboardWidgetBinding>,
): ReportDashboard[] {
  return items.map((dashboard) => ({
    ...dashboard,
    layout: {
      ...dashboard.layout,
      cells: dashboard.layout.cells.map((cell) => {
        if (cell.widget?.reportId !== reportId) return cell;
        return {
          ...cell,
          widget: {
            ...cell.widget,
            ...patch,
            reportId: cell.widget.reportId,
            allotmentId: cell.widget.allotmentId,
          },
        };
      }),
    },
  }));
}

function replaceWidgetsByReportIdOnDashboard(
  items: ReportDashboard[],
  dashboardId: string,
  previousReportId: number,
  nextReportId: number,
  allotmentIds: Map<number, number>,
  patch: Partial<DashboardWidgetBinding>,
): ReportDashboard[] {
  return items.map((dashboard) => {
    if (dashboard.id !== dashboardId) return dashboard;
    return {
      ...dashboard,
      layout: {
        ...dashboard.layout,
        cells: dashboard.layout.cells.map((cell) => {
          const widget = cell.widget;
          if (widget?.reportId !== previousReportId) return cell;
          const nextAllotmentId =
            widget.allotmentId == null ? undefined : allotmentIds.get(widget.allotmentId);
          return {
            ...cell,
            widget: {
              ...widget,
              ...patch,
              reportId: nextReportId,
              ...(nextAllotmentId != null ? { allotmentId: nextAllotmentId } : {}),
            },
          };
        }),
      },
    };
  });
}

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
  // Не применяем слишком маленькую сетку — иначе часть отчётов пропадёт из UI.
  if (!canFitDashboardWidgets(dashboard.layout, preference.rows, preference.cols)) {
    return dashboard;
  }
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
  /** Снимки UI-заголовков сохраняются между повторными загрузками списка в этой сессии. */
  columnHeaderLabelSnapshots: Record<string, DashboardColumnHeaderLabelSnapshot>;
  /** Выбранная пользователем сетка (id дашборда → размер), пока открыта вкладка. */
  layoutPreferences: Record<string, LayoutPreference>;
  loading: boolean;
  error: string | null;
  selectedId: string | null;
  editorOpen: boolean;
  /**
   * Id дашборда, с которого открыли «полный отчёт».
   * Нужен для стрелки возврата на вкладке «Отчёты»; null — перехода не было.
   */
  fullReportReturnDashboardId: string | null;
  setFullReportReturnDashboardId: (id: string | null) => void;
  /** Вернуться к родительскому дашборду после «открыть полный отчёт». */
  returnToDashboardFromFullReport: () => void;
  /**
   * После «Сформировать» у отчёта, открытого с дашборда (savedReportId):
   * обновить definition на бэке и локальные виджеты — иначе дашборд показывает старую версию.
   */
  syncOpenedFullReportToDashboards: (ctx: ReportQueryContext) => Promise<void>;
  /**
   * Сортировка списка дашбордов на бэке:
   * ASC → name,ASC; DESC → name,DESC; null → id,ASC (третий клик стрелки).
   */
  listNameSort: 'ASC' | 'DESC' | null;
  /** Цикл name ASC → name DESC → id ASC, затем снова name ASC. */
  cycleListNameSort: () => void;
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
  columnHeaderLabelSnapshots: {},
  layoutPreferences: {},
  loading: false,
  error: null,
  selectedId: null,
  editorOpen: false,
  fullReportReturnDashboardId: null,
  setFullReportReturnDashboardId: (id) => set({ fullReportReturnDashboardId: id }),

  returnToDashboardFromFullReport: () => {
    const id = get().fullReportReturnDashboardId;
    if (id) {
      // Редактор мог остаться открытым; если нет — восстанавливаем тот же дашборд.
      set({ selectedId: id, editorOpen: true });
    }
    set({ fullReportReturnDashboardId: null, workspaceTab: 'dashboards' });
  },

  listNameSort: 'ASC',
  cycleListNameSort: () => {
    const current = get().listNameSort;
    // ASC → DESC по name; третий клик — id,ASC (listNameSort=null в API).
    const next: 'ASC' | 'DESC' | null =
      current === 'ASC' ? 'DESC' : current === 'DESC' ? null : 'ASC';
    set({ listNameSort: next });
    void get().loadList();
  },

  syncOpenedFullReportToDashboards: async (ctx) => {
    const reportId = ctx.savedReportId;
    if (reportId == null) return;

    const preferredViewMode = normalizeReportViewMode(reportsStore.getState().viewMode);
    const widgetPatch: Partial<DashboardWidgetBinding> = {
      entityName: ctx.entityName,
      body: ctx.body,
      ...(ctx.columnHeaderLabels ? { columnHeaderLabels: ctx.columnHeaderLabels } : {}),
      branchIds: ctx.branchIds,
      branchOffices: ctx.branchOffices,
      preferredViewMode,
      chartSpec: preferredViewMode === 'chart' ? ctx.chartSpec : undefined,
    };

    let name = '';
    for (const dashboard of get().items) {
      for (const cell of dashboard.layout.cells) {
        if (cell.widget?.reportId === reportId && cell.widget.title.trim()) {
          name = cell.widget.title.trim();
          break;
        }
      }
      if (name) break;
    }

    try {
      const existing = await fetchSavedReportById(reportId);
      name = existing.name?.trim() || name || ctx.entityName;
      // entityName в GET почти всегда только в definition — без него в PUT → 409.
      const existingDefinitionEntity =
        existing.definition &&
        typeof existing.definition === 'object' &&
        typeof (existing.definition as { entityName?: unknown }).entityName === 'string'
          ? String((existing.definition as { entityName?: string }).entityName).trim()
          : '';
      const existingEntityName =
        ctx.savedReportEntityName?.trim() ||
        existing.entityName?.trim() ||
        existingDefinitionEntity;
      const entityName = ctx.entityName?.trim() || existingEntityName;
      const sourceDashboardId =
        ctx.savedDashboardId ?? get().fullReportReturnDashboardId ?? undefined;
      // pageableDto обязателен в PUT definition; без sort → 500 на бэке.
      const existingPageable =
        existing.definition &&
        typeof existing.definition === 'object' &&
        (existing.definition as { pageableDto?: unknown }).pageableDto &&
        typeof (existing.definition as { pageableDto?: unknown }).pageableDto === 'object'
          ? ((existing.definition as { pageableDto: Record<string, unknown> }).pageableDto)
          : null;
      const pageableDto = existingPageable
        ? {
            limit: Number(existingPageable.limit) || 25,
            offset: Number(existingPageable.offset) || 0,
            sort: Array.isArray(existingPageable.sort) ? existingPageable.sort : [],
          }
        : { limit: 25, offset: 0, sort: [] as [] };
      const definitionBody = {
        ...ctx.body,
        // Пустые values у фильтров на save не отправляем.
        filters: (ctx.body.filters ?? []).filter((filter) => {
          if (!Array.isArray(filter.values)) return true;
          if (!filter.values.length) return false;
          return filter.values.every((value) => value !== '' && value != null);
        }),
      };
      const definition = {
        ...buildAllotmentDefinitionFromWidget({
          title: name,
          entityName,
          body: definitionBody,
          preferredViewMode,
        }),
        entityName,
        pageableDto,
      };

      if (existingEntityName && entityName !== existingEntityName) {
        if (!sourceDashboardId) {
          throw new Error('Не удалось определить исходный дашборд для перепривязки отчёта');
        }
        const backendDashboardId = parseBackendDashboardId(sourceDashboardId);
        if (backendDashboardId == null) {
          throw new Error('Не удалось определить исходный дашборд для перепривязки отчёта');
        }
        const oldAllotments = await fetchReportDashboardAllotments({
          page: 0,
          size: 500,
          reportId: { equals: reportId },
          isActiveEquals: true,
        });
        const sourceAllotments = oldAllotments.filter(
          (allotment) => allotment.dashboard?.id === backendDashboardId,
        );
        if (!sourceAllotments.length) {
          throw new Error('Не найдены активные привязки исходного отчёта к дашборду');
        }
        if (sourceAllotments.length !== oldAllotments.length) {
          throw new Error(
            'Отчёт также привязан к другим дашбордам. Смена сущности без изменения этих привязок невозможна.',
          );
        }
        if (sourceAllotments.some((allotment) => allotment.dashboard?.id == null)) {
          throw new Error('Не удалось определить дашборд для переноса отчёта');
        }

        const previousDefinition =
          existing.definition && typeof existing.definition === 'object'
            ? {
                ...existing.definition,
                entityName: existingEntityName,
                pageableDto,
              }
            : null;
        if (!previousDefinition) {
          throw new Error('Не удалось получить параметры исходного отчёта для замены сущности');
        }

        const temporaryName = `${name}__replacing_${reportId}_${Date.now()}`;
        const createdAllotments: ReportDashboardAllotment[] = [];
        const deletedAllotments: ReportDashboardAllotment[] = [];
        let saved: Awaited<ReturnType<typeof saveReportForEntity>> | null = null;
        let oldReportRenamed = false;
        try {
          await updateSavedReport(reportId, {
            name: temporaryName,
            visibility: existing.visibility || 'private',
            entityName: existingEntityName,
            definition: previousDefinition,
          });
          oldReportRenamed = true;
          saved = await saveReportForEntity(entityName, {
            name,
            visibility: existing.visibility || 'private',
            entityName,
            definition,
          });
          for (const allotment of sourceAllotments) {
            const dashboardId = allotment.dashboard?.id;
            if (dashboardId == null) {
              throw new Error('Не удалось определить дашборд для переноса отчёта');
            }
            const created = await createReportDashboardAllotment({
              reportId: saved.id,
              dashboardId,
            });
            createdAllotments.push(...created);
          }
          for (const allotment of sourceAllotments) {
            await deleteReportDashboardAllotment(allotment.id);
            deletedAllotments.push(allotment);
          }
          await deleteSavedReport(reportId);
        } catch (error) {
          const rollbackErrors: string[] = [];
          for (const allotment of deletedAllotments) {
            const dashboardId = allotment.dashboard?.id;
            if (dashboardId == null) continue;
            try {
              await createReportDashboardAllotment({ reportId, dashboardId });
            } catch (rollbackError) {
              rollbackErrors.push(errorMessage(rollbackError, 'не удалось восстановить привязку'));
            }
          }
          for (const allotment of createdAllotments) {
            try {
              await deleteReportDashboardAllotment(allotment.id);
            } catch (rollbackError) {
              rollbackErrors.push(errorMessage(rollbackError, 'не удалось удалить новую привязку'));
            }
          }
          if (saved) {
            try {
              await deleteSavedReport(saved.id);
            } catch (rollbackError) {
              rollbackErrors.push(errorMessage(rollbackError, 'не удалось удалить новый отчёт'));
            }
          }
          if (oldReportRenamed) {
            try {
              await updateSavedReport(reportId, {
                name,
                visibility: existing.visibility || 'private',
                entityName: existingEntityName,
                definition: previousDefinition,
              });
            } catch (rollbackError) {
              rollbackErrors.push(errorMessage(rollbackError, 'не удалось восстановить имя отчёта'));
            }
          }
          if (rollbackErrors.length) {
            throw new Error(
              `${errorMessage(error, 'Не удалось перепривязать отчёт')}; ` +
                `ошибка отката: ${rollbackErrors.join('; ')}`,
            );
          }
          throw error;
        }

        const allotmentIdMap = new Map<number, number>();
        const createdByDashboard = new Map<number, ReportDashboardAllotment[]>();
        for (const allotment of createdAllotments) {
          const dashboardId = allotment.dashboard?.id;
          if (dashboardId == null) continue;
          const matching = createdByDashboard.get(dashboardId) ?? [];
          matching.push(allotment);
          createdByDashboard.set(dashboardId, matching);
        }
        sourceAllotments.forEach((oldAllotment, index) => {
          const dashboardId = oldAllotment.dashboard?.id;
          const newAllotment =
            (dashboardId == null ? undefined : createdByDashboard.get(dashboardId)?.shift()) ??
            createdAllotments[index];
          if (newAllotment?.id != null) {
            allotmentIdMap.set(oldAllotment.id, newAllotment.id);
          }
        });
        set((state) => ({
          items: replaceWidgetsByReportIdOnDashboard(
            state.items,
            sourceDashboardId,
            reportId,
            saved.id,
            allotmentIdMap,
            widgetPatch,
          ),
          ...(ctx.columnHeaderLabels
            ? {
                columnHeaderLabelSnapshots: {
                  ...state.columnHeaderLabelSnapshots,
                  [String(saved.id)]: {
                    selectedFields: ctx.body.selectedFields.map((field) => ({ ...field })),
                    columnHeaderLabels: { ...ctx.columnHeaderLabels },
                  },
                },
              }
            : {}),
        }));
        const currentContext = reportGenerationStore.getState().queryContext;
        if (currentContext) {
          reportGenerationStore.getState().setQueryContext({
            ...currentContext,
            savedReportId: saved.id,
            savedReportEntityName: entityName,
          });
        }
        await get().loadList();
        return;
      }

      // Сразу локально — виджет перезапросит данные при возврате на дашборд.
      set((state) => ({
        items: patchWidgetsByReportId(state.items, reportId, widgetPatch),
        ...(ctx.columnHeaderLabels
          ? {
              columnHeaderLabelSnapshots: {
                ...state.columnHeaderLabelSnapshots,
                [String(reportId)]: {
                  selectedFields: ctx.body.selectedFields.map((field) => ({ ...field })),
                  columnHeaderLabels: { ...ctx.columnHeaderLabels },
                },
              },
            }
          : {}),
      }));
      // PUT только через dataForUpdate (см. updateSavedReport) — плоский body → 400.
      await updateSavedReport(reportId, {
        name,
        visibility: existing.visibility || 'private',
        entityName,
        definition,
      });
    } catch (error) {
      enqueueSnackbar(
        error instanceof Error && error.message
          ? error.message
          : 'Не удалось сохранить изменения отчёта на дашборде',
        { variant: 'warning' },
      );
    }
  },

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
      const all = await localDashboardRepository.list(get().listNameSort);
      const filtered = user ? all.filter((item) => canAccess(item, user.id)) : all;
      const { layoutPreferences, columnHeaderLabelSnapshots } = get();
      const items = filtered
        .map((item) => applyLayoutPreference(item, layoutPreferences[item.id]))
        .map((dashboard) => ({
          ...dashboard,
          layout: {
            ...dashboard.layout,
            cells: dashboard.layout.cells.map((cell) =>
              cell.widget
                ? {
                    ...cell,
                    widget: applyDashboardColumnHeaderLabelSnapshot(
                      cell.widget,
                      columnHeaderLabelSnapshots,
                    ),
                  }
                : cell,
            ),
          },
        }));
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
    const current = get().items.find((item) => item.id === id);
    if (current && !canFitDashboardWidgets(current.layout, layout.rows, layout.cols)) {
      set({
        error:
          'Нельзя уменьшить сетку: число отчётов больше, чем ячеек в новой раскладке',
      });
      return;
    }
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
    // Ячейку берём из стора (id совпадают с UI). getById пересобирает сетку с другими
    // cell-0/cell-1 — после смены раскладки поиск по cellId ломался и DELETE не уходил.
    const current = get().items.find((item) => item.id === dashboardId);
    if (!current) return;
    const widget = current.layout.cells.find((cell) => cell.id === cellId)?.widget ?? null;
    set({ error: null });
    try {
      if (widget?.allotmentId != null) {
        await deleteReportDashboardAllotment(widget.allotmentId);
      } else if (widget?.reportId != null) {
        // Запасной путь: найти привязку по reportId на бэке.
        const backendId = parseBackendDashboardId(dashboardId);
        if (backendId != null) {
          const remote = await fetchReportDashboardAllotments({
            page: 0,
            size: 200,
            dashboardId: { equals: backendId },
            reportId: { equals: widget.reportId },
            isActiveEquals: true,
          });
          const allotmentId = remote[0]?.id;
          if (allotmentId != null) {
            await deleteReportDashboardAllotment(allotmentId);
          }
        }
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
