import { create } from 'zustand';

import type { Values } from '@shared/ui/search_multiple_select';

import {
  applyReportEntityListLabel,
  collectReferenceEntitiesFromMetadata,
} from '../lib/buildReportTableFieldOptions';
import type { ReportVehicleLabelMaps } from '../lib/fetchVehicleFrontDataMaps';
import {
  reportOutputFunctionKey,
  reportOutputOperationKey,
} from '../lib/reportOutputFilterKeys';
import {
  createAdditionalReportOutputRow,
  createDefaultReportOutputRow,
  getPrimaryOutputRowFromList,
  PRIMARY_REPORT_OUTPUT_ROW_ID,
} from '../lib/reportOutputRow';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFilterControlDef,
  ReportLogicOperator,
  ReportNestedEntityFilterByField,
  ReportNestedEntityFilterState,
  ReportOutputRow,
  ReportUiFilterSelections,
  ReportViewMode,
} from '../types/reportApiTypes';

/** Один запрос metadata на referenceEntity — параллельные вызовы ждут тот же Promise. */
const referenceEntityMetadataInflight = new Map<string, Promise<void>>();

type ReportsStore = {
  entities: ReportEntityListItem[];
  entitiesLoading: boolean;
  entitiesError: string | null;
  selectedEntityName: string | null;
  metadata: ReportEntityMetadata | null;
  metadataLoading: boolean;
  metadataError: string | null;
  filterControls: ReportFilterControlDef[];
  outputRows: ReportOutputRow[];
  logicOperator: ReportLogicOperator;
  referenceRecordsCache: Record<string, unknown[]>;
  referenceRecordsLoading: boolean;
  vehicleLabelMaps: ReportVehicleLabelMaps;
  vehicleLabelMapsLoading: boolean;
  viewMode: ReportViewMode;
  loadEntities: () => Promise<void>;
  setSelectedEntityName: (name: string | null) => void;
  loadMetadataForEntity: (entityName: string) => Promise<void>;
  addOutputRow: (logicOperator: ReportLogicOperator) => void;
  removeOutputRow: (rowId: string) => void;
  setOutputRowSelectedFields: (rowId: string, values: Values) => void;
  setOutputRowFilterSelection: (rowId: string, controlId: string, values: Values) => void;
  setOutputRowNestedEntityFilter: (
    rowId: string,
    fieldName: string,
    patch: Partial<ReportNestedEntityFilterState>,
  ) => void;
  setOutputRowReportTableFields: (rowId: string, values: Values) => void;
  /** GET api/v1/reports/{referenceEntity}/metadata — referenceEntity из «Поле результата». */
  loadReportTableFieldsMetadata: (rowId: string, referenceEntity: string) => Promise<void>;
  /** Кэш metadata вложенных сущностей по имени (BranchOffice, User, …). */
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
  referenceEntityMetadataLoadingByName: Record<string, boolean>;
  loadReferenceEntityMetadata: (referenceEntity: string) => Promise<void>;
  loadAllReferenceEntityMetadataForReport: (entityMetadata: ReportEntityMetadata) => Promise<void>;
  reportTableFieldsMetadataByRowId: Record<string, ReportEntityMetadata | null>;
  reportTableFieldsMetadataLoadingByRowId: Record<string, boolean>;
  reportTableFieldsMetadataKeyByRowId: Record<string, string>;
  loadReferenceEntityRecords: (referenceEntity: string) => Promise<void>;
  loadVehicleLabelMaps: () => Promise<void>;
  setViewMode: (mode: ReportViewMode) => void;
  resetFilters: () => void;
};

const emptySelections = (): ReportUiFilterSelections => ({});

const emptyNestedFilters = (): ReportNestedEntityFilterByField => ({});

const defaultNestedFilterState = (): ReportNestedEntityFilterState => ({
  path: [],
  values: [],
});

const emptyLabelMaps = (): ReportVehicleLabelMaps => ({ types: {}, colors: {} });

const defaultOutputRows = (): ReportOutputRow[] => [createDefaultReportOutputRow()];

function resetRowFilterState(row: ReportOutputRow): ReportOutputRow {
  return {
    ...row,
    selectedOutputFields: [],
    reportTableFields: [],
    filterSelections: emptySelections(),
    nestedEntityFilterByField: emptyNestedFilters(),
  };
}

function omitRowReportTableMetadataCache(
  byRowId: Record<string, ReportEntityMetadata | null>,
  loadingByRowId: Record<string, boolean>,
  keyByRowId: Record<string, string>,
  rowId: string,
) {
  const { [rowId]: _meta, ...restMeta } = byRowId;
  const { [rowId]: _loading, ...restLoading } = loadingByRowId;
  const { [rowId]: _key, ...restKey } = keyByRowId;
  return {
    reportTableFieldsMetadataByRowId: restMeta,
    reportTableFieldsMetadataLoadingByRowId: restLoading,
    reportTableFieldsMetadataKeyByRowId: restKey,
  };
}

export const reportsStore = create<ReportsStore>()((set, get) => ({
  entities: [],
  entitiesLoading: false,
  entitiesError: null,
  selectedEntityName: null,
  metadata: null,
  metadataLoading: false,
  metadataError: null,
  filterControls: [],
  outputRows: defaultOutputRows(),
  logicOperator: 'or',
  referenceRecordsCache: {},
  referenceRecordsLoading: false,
  vehicleLabelMaps: emptyLabelMaps(),
  vehicleLabelMapsLoading: false,
  referenceEntityMetadataByName: {},
  referenceEntityMetadataLoadingByName: {},
  reportTableFieldsMetadataByRowId: {},
  reportTableFieldsMetadataLoadingByRowId: {},
  reportTableFieldsMetadataKeyByRowId: {},
  viewMode: 'table',

  async loadEntities() {
    set({ entitiesLoading: true, entitiesError: null });
    try {
      const { fetchReportEntities } = await import('../api/reportsApi');
      const entities = await fetchReportEntities();
      const state = get();
      const metadata =
        state.metadata && state.selectedEntityName
          ? applyReportEntityListLabel(state.metadata, entities)
          : state.metadata;
      set({ entities, entitiesLoading: false, ...(metadata ? { metadata } : {}) });
    } catch (e) {
      set({
        entitiesLoading: false,
        entitiesError: e instanceof Error ? e.message : 'load entities failed',
      });
    }
  },

  setSelectedEntityName(name) {
    set({
      selectedEntityName: name,
      metadata: null,
      metadataError: null,
      filterControls: [],
      outputRows: defaultOutputRows(),
      logicOperator: 'or',
      referenceRecordsCache: {},
      referenceRecordsLoading: false,
      vehicleLabelMaps: emptyLabelMaps(),
      vehicleLabelMapsLoading: false,
      referenceEntityMetadataByName: {},
      referenceEntityMetadataLoadingByName: {},
      reportTableFieldsMetadataByRowId: {},
      reportTableFieldsMetadataLoadingByRowId: {},
      reportTableFieldsMetadataKeyByRowId: {},
    });
  },

  async loadMetadataForEntity(entityName) {
    const current = get();
    if (current.metadata?.entityName === entityName && current.metadataLoading) {
      return;
    }
    if (current.metadata?.entityName === entityName && current.metadata) {
      await get().loadAllReferenceEntityMetadataForReport(current.metadata);
      return;
    }

    set({ metadataLoading: true, metadataError: null });
    try {
      const { fetchReportEntityMetadata } = await import('../api/reportsApi');
      const { buildFilterControls } = await import('../lib/extractMetadataFilterOptions');
      const rawMetadata = await fetchReportEntityMetadata(entityName);
      const metadata = applyReportEntityListLabel(rawMetadata, get().entities);
      const filterControls = buildFilterControls(metadata);
      set({
        metadata,
        metadataLoading: false,
        filterControls,
        outputRows: defaultOutputRows(),
        logicOperator: 'or',
        referenceRecordsCache: {},
        referenceRecordsLoading: false,
        vehicleLabelMaps: emptyLabelMaps(),
        vehicleLabelMapsLoading: false,
        referenceEntityMetadataByName: {},
        referenceEntityMetadataLoadingByName: {},
        reportTableFieldsMetadataByRowId: {},
        reportTableFieldsMetadataLoadingByRowId: {},
        reportTableFieldsMetadataKeyByRowId: {},
      });
      await get().loadAllReferenceEntityMetadataForReport(metadata);
      if (entityName === 'Vehicle') {
        void get().loadVehicleLabelMaps();
      }
    } catch (e) {
      set({
        metadataLoading: false,
        metadataError: e instanceof Error ? e.message : 'load metadata failed',
        metadata: null,
        filterControls: [],
        referenceEntityMetadataByName: {},
        referenceEntityMetadataLoadingByName: {},
        reportTableFieldsMetadataByRowId: {},
        reportTableFieldsMetadataLoadingByRowId: {},
        reportTableFieldsMetadataKeyByRowId: {},
      });
    }
  },

  async loadReferenceEntityMetadata(referenceEntity) {
    const key = referenceEntity.trim();
    if (!key) return;

    if (get().referenceEntityMetadataByName[key]) {
      return;
    }

    const inflight = referenceEntityMetadataInflight.get(key);
    if (inflight) {
      await inflight;
      return;
    }

    const loadPromise = (async () => {
      set({
        referenceEntityMetadataLoadingByName: {
          ...get().referenceEntityMetadataLoadingByName,
          [key]: true,
        },
      });

      try {
        const { fetchReportEntityMetadata } = await import('../api/reportsApi');
        const tableMetadata = await fetchReportEntityMetadata(key);
        set((current) => ({
          referenceEntityMetadataByName: {
            ...current.referenceEntityMetadataByName,
            [key]: tableMetadata,
          },
          referenceEntityMetadataLoadingByName: {
            ...current.referenceEntityMetadataLoadingByName,
            [key]: false,
          },
        }));
      } catch {
        set((current) => {
          const { [key]: _removed, ...restMeta } = current.referenceEntityMetadataByName;
          return {
            referenceEntityMetadataByName: restMeta,
            referenceEntityMetadataLoadingByName: {
              ...current.referenceEntityMetadataLoadingByName,
              [key]: false,
            },
          };
        });
      } finally {
        referenceEntityMetadataInflight.delete(key);
      }
    })();

    referenceEntityMetadataInflight.set(key, loadPromise);
    await loadPromise;
  },

  async loadAllReferenceEntityMetadataForReport(entityMetadata) {
    const refs = collectReferenceEntitiesFromMetadata(entityMetadata);
    if (!refs.length) return;
    await Promise.all(refs.map((ref) => get().loadReferenceEntityMetadata(ref)));
  },

  addOutputRow(logicOperator) {
    const current = get().outputRows;
    set({
      logicOperator,
      outputRows: current.length
        ? [...current, createAdditionalReportOutputRow()]
        : [createDefaultReportOutputRow()],
    });
  },

  removeOutputRow(rowId) {
    const current = get().outputRows;
    if (current.length > 1) {
      set({
        outputRows: current.filter((row) => row.id !== rowId),
        ...omitRowReportTableMetadataCache(
          get().reportTableFieldsMetadataByRowId,
          get().reportTableFieldsMetadataLoadingByRowId,
          get().reportTableFieldsMetadataKeyByRowId,
          rowId,
        ),
      });
      return;
    }
    const primary = getPrimaryOutputRowFromList(current);
    if (primary.id !== rowId) return;
    set({
      outputRows: [resetRowFilterState(primary)],
      ...omitRowReportTableMetadataCache(
        get().reportTableFieldsMetadataByRowId,
        get().reportTableFieldsMetadataLoadingByRowId,
        get().reportTableFieldsMetadataKeyByRowId,
        rowId,
      ),
    });
  },

  setOutputRowSelectedFields(rowId, values) {
    const single = values.slice(0, 1);
    set({
      outputRows: get().outputRows.map((row) =>
        row.id === rowId
          ? {
              ...row,
              selectedOutputFields: single,
              reportTableFields: [],
              filterSelections: emptySelections(),
              nestedEntityFilterByField: emptyNestedFilters(),
            }
          : row,
      ),
      ...omitRowReportTableMetadataCache(
        get().reportTableFieldsMetadataByRowId,
        get().reportTableFieldsMetadataLoadingByRowId,
        get().reportTableFieldsMetadataKeyByRowId,
        rowId,
      ),
    });

    const fieldKey = single[0] ? String(single[0].value) : '';
    if (!fieldKey) return;
    const field = get().metadata?.fields?.find((f) => f.fieldName === fieldKey);
    const refEntity = field?.referenceEntity?.trim();
    if (!refEntity) return;
    void get().loadReferenceEntityMetadata(refEntity);
  },

  setOutputRowFilterSelection(rowId, controlId, values) {
    set({
      outputRows: get().outputRows.map((row) =>
        row.id === rowId
          ? { ...row, filterSelections: { ...row.filterSelections, [controlId]: values } }
          : row,
      ),
    });
  },

  setOutputRowNestedEntityFilter(rowId, fieldName, patch) {
    set((state) => ({
      outputRows: state.outputRows.map((row) => {
        if (row.id !== rowId) return row;
        const prev = row.nestedEntityFilterByField[fieldName] ?? defaultNestedFilterState();
        const prevPath = prev.path?.length
          ? prev.path
          : prev.attribute?.trim()
            ? [prev.attribute.trim()]
            : [];

        let nextPath = prevPath;
        if (patch.path !== undefined) {
          nextPath = [...patch.path];
        } else if (patch.attribute !== undefined) {
          nextPath = patch.attribute ? [patch.attribute] : [];
        }

        const pathChanged =
          nextPath.length !== prevPath.length ||
          nextPath.some((segment, index) => segment !== prevPath[index]);

        const nextValues = pathChanged
          ? (patch.values ?? [])
          : patch.values !== undefined
            ? patch.values
            : prev.values;

        const rowTerminalReset =
          pathChanged || (patch.values !== undefined && nextValues.length === 0);

        return {
          ...row,
          reportTableFields: rowTerminalReset ? [] : row.reportTableFields,
          filterSelections: rowTerminalReset ? emptySelections() : row.filterSelections,
          nestedEntityFilterByField: {
            ...row.nestedEntityFilterByField,
            [fieldName]: {
              path: nextPath,
              values: nextValues,
            },
          },
        };
      }),
    }));
  },

  async loadReportTableFieldsMetadata(rowId, referenceEntity) {
    const key = referenceEntity.trim();
    if (!key) return;

    const state = get();
    if (
      state.reportTableFieldsMetadataKeyByRowId[rowId] === key &&
      state.reportTableFieldsMetadataByRowId[rowId]
    ) {
      return;
    }

    set({
      reportTableFieldsMetadataLoadingByRowId: {
        ...state.reportTableFieldsMetadataLoadingByRowId,
        [rowId]: true,
      },
    });

    await get().loadReferenceEntityMetadata(key);

    const tableMetadata = get().referenceEntityMetadataByName[key] ?? null;
    set((current) => ({
      reportTableFieldsMetadataByRowId: {
        ...current.reportTableFieldsMetadataByRowId,
        [rowId]: tableMetadata,
      },
      reportTableFieldsMetadataKeyByRowId: {
        ...current.reportTableFieldsMetadataKeyByRowId,
        [rowId]: key,
      },
      reportTableFieldsMetadataLoadingByRowId: {
        ...current.reportTableFieldsMetadataLoadingByRowId,
        [rowId]: false,
      },
    }));
  },

  setOutputRowReportTableFields(rowId, values) {
    set({
      outputRows: get().outputRows.map((row) => {
        if (row.id !== rowId) return row;
        if (values.length > 0) {
          return { ...row, reportTableFields: values };
        }
        const opKey = reportOutputOperationKey(rowId);
        const fnKey = reportOutputFunctionKey(rowId);
        const { [opKey]: _op, [fnKey]: _fn, ...rest } = row.filterSelections;
        return { ...row, reportTableFields: [], filterSelections: rest };
      }),
    });
  },

  async loadReferenceEntityRecords(referenceEntity) {
    const cacheKey = referenceEntity.trim();
    if (!cacheKey) return;
    const { isReportReferenceEntityServerSearch } = await import(
      '../lib/reportReferenceEntityServerSearch'
    );
    if (isReportReferenceEntityServerSearch(cacheKey)) {
      return;
    }
    const cached = get().referenceRecordsCache[cacheKey];
    if (cached?.length && !get().referenceRecordsLoading) {
      return;
    }

    set({ referenceRecordsLoading: true });
    try {
      const { fetchReportReferenceEntityRecords } = await import('../lib/fetchReportReferenceEntityRecords');
      const records = await fetchReportReferenceEntityRecords(cacheKey);
      set({
        referenceRecordsCache: { ...get().referenceRecordsCache, [cacheKey]: records },
        referenceRecordsLoading: false,
      });
    } catch {
      set({
        referenceRecordsCache: { ...get().referenceRecordsCache, [cacheKey]: [] },
        referenceRecordsLoading: false,
      });
    }
  },

  async loadVehicleLabelMaps() {
    const current = get();
    const hasMaps =
      Object.keys(current.vehicleLabelMaps.types).length > 0 ||
      Object.keys(current.vehicleLabelMaps.colors).length > 0;
    if (hasMaps && !current.vehicleLabelMapsLoading) {
      return;
    }

    set({ vehicleLabelMapsLoading: true });
    try {
      const { fetchVehicleFrontDataMaps } = await import('../lib/fetchVehicleFrontDataMaps');
      const vehicleLabelMaps = await fetchVehicleFrontDataMaps();
      set({ vehicleLabelMaps, vehicleLabelMapsLoading: false });
    } catch {
      set({ vehicleLabelMaps: emptyLabelMaps(), vehicleLabelMapsLoading: false });
    }
  },

  setViewMode(mode) {
    set({ viewMode: mode });
  },

  resetFilters() {
    set({
      outputRows: get().outputRows.map(resetRowFilterState),
      referenceRecordsCache: {},
      vehicleLabelMaps: emptyLabelMaps(),
      vehicleLabelMapsLoading: false,
      referenceEntityMetadataByName: {},
      referenceEntityMetadataLoadingByName: {},
      reportTableFieldsMetadataByRowId: {},
      reportTableFieldsMetadataLoadingByRowId: {},
      reportTableFieldsMetadataKeyByRowId: {},
    });
    const entityMetadata = get().metadata;
    if (entityMetadata) {
      void get().loadAllReferenceEntityMetadataForReport(entityMetadata);
    }
  },
}));

/** Первая строка фильтров (поле результата и зависимые контролы). */
export function getPrimaryReportOutputRow(store = reportsStore.getState()): ReportOutputRow {
  return getPrimaryOutputRowFromList(store.outputRows);
}
