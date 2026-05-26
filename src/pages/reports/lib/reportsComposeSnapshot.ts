import type {
  ReportEntityMetadata,
  ReportFilterControlDef,
  ReportLogicOperator,
  ReportOutputRow,
} from '../types/reportApiTypes';
import { reportsStore } from '../model/reportsStore';

export type ReportsComposeSnapshot = {
  selectedEntityName: string | null;
  metadata: ReportEntityMetadata | null;
  metadataLoading: boolean;
  metadataError: string | null;
  filterControls: ReportFilterControlDef[];
  outputRows: ReportOutputRow[];
  logicOperator: ReportLogicOperator;
  reportTableFieldsMetadataByRowId: Record<string, ReportEntityMetadata | null>;
  reportTableFieldsMetadataLoadingByRowId: Record<string, boolean>;
  reportTableFieldsMetadataKeyByRowId: Record<string, string>;
};

function cloneOutputRows(rows: ReportOutputRow[]): ReportOutputRow[] {
  return rows.map((row) => ({
    ...row,
    selectedOutputFields: [...row.selectedOutputFields],
    reportTableFields: [...row.reportTableFields],
    filterSelections: { ...row.filterSelections },
    nestedEntityFilterByField: Object.fromEntries(
      Object.entries(row.nestedEntityFilterByField).map(([key, state]) => [
        key,
        { ...state, values: [...state.values] },
      ]),
    ),
  }));
}

export function captureReportsComposeSnapshot(): ReportsComposeSnapshot {
  const state = reportsStore.getState();
  return {
    selectedEntityName: state.selectedEntityName,
    metadata: state.metadata,
    metadataLoading: state.metadataLoading,
    metadataError: state.metadataError,
    filterControls: [...state.filterControls],
    outputRows: cloneOutputRows(state.outputRows),
    logicOperator: state.logicOperator,
    reportTableFieldsMetadataByRowId: { ...state.reportTableFieldsMetadataByRowId },
    reportTableFieldsMetadataLoadingByRowId: {
      ...state.reportTableFieldsMetadataLoadingByRowId,
    },
    reportTableFieldsMetadataKeyByRowId: { ...state.reportTableFieldsMetadataKeyByRowId },
  };
}

export function restoreReportsComposeSnapshot(snapshot: ReportsComposeSnapshot): void {
  reportsStore.setState({
    selectedEntityName: snapshot.selectedEntityName,
    metadata: snapshot.metadata,
    metadataLoading: snapshot.metadataLoading,
    metadataError: snapshot.metadataError,
    filterControls: [...snapshot.filterControls],
    outputRows: cloneOutputRows(snapshot.outputRows),
    logicOperator: snapshot.logicOperator,
    reportTableFieldsMetadataByRowId: { ...snapshot.reportTableFieldsMetadataByRowId },
    reportTableFieldsMetadataLoadingByRowId: {
      ...snapshot.reportTableFieldsMetadataLoadingByRowId,
    },
    reportTableFieldsMetadataKeyByRowId: { ...snapshot.reportTableFieldsMetadataKeyByRowId },
  });
}
