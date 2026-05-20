import { create } from 'zustand';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportVehicleLabelMaps } from '../lib/fetchVehicleFrontDataMaps';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFilterControlDef,
  ReportNestedEntityFilterByField,
  ReportNestedEntityFilterState,
  ReportUiFilterSelections,
  ReportViewMode,
} from '../types/reportApiTypes';

type ReportsStore = {
  entities: ReportEntityListItem[];
  entitiesLoading: boolean;
  entitiesError: string | null;
  selectedEntityName: string | null;
  metadata: ReportEntityMetadata | null;
  metadataLoading: boolean;
  metadataError: string | null;
  filterControls: ReportFilterControlDef[];
  selectedOutputFields: Values;
  filterSelections: ReportUiFilterSelections;
  referenceRecordsCache: Record<string, unknown[]>;
  referenceRecordsLoading: boolean;
  nestedEntityFilterByField: ReportNestedEntityFilterByField;
  vehicleLabelMaps: ReportVehicleLabelMaps;
  vehicleLabelMapsLoading: boolean;
  viewMode: ReportViewMode;
  loadEntities: () => Promise<void>;
  setSelectedEntityName: (name: string | null) => void;
  loadMetadataForEntity: (entityName: string) => Promise<void>;
  setSelectedOutputFields: (values: Values) => void;
  setFilterSelection: (controlId: string, values: Values) => void;
  loadReferenceEntityRecords: (referenceEntity: string) => Promise<void>;
  setNestedEntityFilter: (fieldName: string, patch: Partial<ReportNestedEntityFilterState>) => void;
  loadVehicleLabelMaps: () => Promise<void>;
  setViewMode: (mode: ReportViewMode) => void;
  resetFilters: () => void;
};

const emptySelections = (): ReportUiFilterSelections => ({});

const emptyNestedFilters = (): ReportNestedEntityFilterByField => ({});

const defaultNestedFilterState = (): ReportNestedEntityFilterState => ({
  attribute: null,
  values: [],
});

const emptyLabelMaps = (): ReportVehicleLabelMaps => ({ types: {}, colors: {} });

export const reportsStore = create<ReportsStore>()((set, get) => ({
  entities: [],
  entitiesLoading: false,
  entitiesError: null,
  selectedEntityName: null,
  metadata: null,
  metadataLoading: false,
  metadataError: null,
  filterControls: [],
  selectedOutputFields: [],
  filterSelections: emptySelections(),
  referenceRecordsCache: {},
  referenceRecordsLoading: false,
  nestedEntityFilterByField: emptyNestedFilters(),
  vehicleLabelMaps: emptyLabelMaps(),
  vehicleLabelMapsLoading: false,
  viewMode: 'table',

  async loadEntities() {
    set({ entitiesLoading: true, entitiesError: null });
    try {
      const { fetchReportEntities } = await import('../api/reportsApi');
      const entities = await fetchReportEntities();
      set({ entities, entitiesLoading: false });
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
      selectedOutputFields: [],
      filterSelections: emptySelections(),
      referenceRecordsCache: {},
      referenceRecordsLoading: false,
      nestedEntityFilterByField: emptyNestedFilters(),
      vehicleLabelMaps: emptyLabelMaps(),
      vehicleLabelMapsLoading: false,
    });
  },

  async loadMetadataForEntity(entityName) {
    const current = get();
    if (current.metadata?.entityName === entityName && current.metadataLoading) {
      return;
    }
    if (current.metadata?.entityName === entityName && current.metadata) {
      return;
    }

    set({ metadataLoading: true, metadataError: null });
    try {
      const { fetchReportEntityMetadata } = await import('../api/reportsApi');
      const { buildFilterControls } = await import('../lib/extractMetadataFilterOptions');
      const metadata = await fetchReportEntityMetadata(entityName);
      const filterControls = buildFilterControls(metadata);
      set({
        metadata,
        metadataLoading: false,
        filterControls,
        selectedOutputFields: [],
        filterSelections: emptySelections(),
        referenceRecordsCache: {},
        referenceRecordsLoading: false,
        nestedEntityFilterByField: emptyNestedFilters(),
        vehicleLabelMaps: emptyLabelMaps(),
        vehicleLabelMapsLoading: false,
      });
    } catch (e) {
      set({
        metadataLoading: false,
        metadataError: e instanceof Error ? e.message : 'load metadata failed',
        metadata: null,
        filterControls: [],
      });
    }
  },

  setSelectedOutputFields(values) {
    const single = values.slice(0, 1);
    set({
      selectedOutputFields: single,
      filterSelections: emptySelections(),
      referenceRecordsCache: {},
      referenceRecordsLoading: false,
      nestedEntityFilterByField: emptyNestedFilters(),
      vehicleLabelMaps: emptyLabelMaps(),
      vehicleLabelMapsLoading: false,
    });
  },

  setFilterSelection(controlId, values) {
    set({
      filterSelections: { ...get().filterSelections, [controlId]: values },
    });
  },

  async loadReferenceEntityRecords(referenceEntity) {
    const cacheKey = referenceEntity.trim();
    if (!cacheKey) return;
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

  setNestedEntityFilter(fieldName, patch) {
    const prev = get().nestedEntityFilterByField[fieldName] ?? defaultNestedFilterState();
    set({
      nestedEntityFilterByField: {
        ...get().nestedEntityFilterByField,
        [fieldName]: {
          attribute: patch.attribute !== undefined ? patch.attribute : prev.attribute,
          values:
            patch.attribute !== undefined && patch.attribute !== prev.attribute
              ? (patch.values ?? [])
              : patch.values !== undefined
                ? patch.values
                : prev.values,
        },
      },
    });
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
      filterSelections: emptySelections(),
      selectedOutputFields: [],
      referenceRecordsCache: {},
      nestedEntityFilterByField: emptyNestedFilters(),
      vehicleLabelMaps: emptyLabelMaps(),
      vehicleLabelMapsLoading: false,
    });
  },
}));
