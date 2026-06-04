import i18n from 'i18next';
import { enqueueSnackbar } from 'notistack';
import { create } from 'zustand';

import {
  REPORT_QUERY_TRANSPORT_ERROR,
  executeReportQuery,
  exportReport,
  type ReportExportFormat,
} from '../api/reportsApi';
import { downloadReportFile } from '../lib/downloadReportFile';
import { buildReportColumnHeaderLabels } from '../lib/buildReportColumnHeaderLabels';
import { reportsStore } from './reportsStore';

import type { ReportQueryRequest, ReportQueryResponse } from '../types/reportApiTypes';

export const DEFAULT_REPORT_PAGE_SIZE = 25;

export type ReportQueryContext = {
  entityName: string;
  body: ReportQueryRequest;
  /** Заголовки колонок на момент формирования отчёта (не пересчитываются при черновике в модалке). */
  columnHeaderLabels?: Record<string, string>;
};

let reportFetchAbortController: AbortController | null = null;
let reportPageRequestSeq = 0;

type ReportGenerationState = {
  isGenerating: boolean;
  isExporting: boolean;
  isLoadingPage: boolean;
  progress: number;
  loaded: number;
  total: number;
  runStartedAt: number | null;
  lastResult: ReportQueryResponse | null;
  queryContext: ReportQueryContext | null;
  pagination: { page: number; pageSize: number };
  sort: string[];
  setSort: (sort: string[]) => void;
  prepareNewReportView: () => void;
  start: () => void;
  getAbortSignal: () => AbortSignal | undefined;
  abortRun: () => void;
  setProgress: (loaded: number, total: number) => void;
  setQueryContext: (context: ReportQueryContext | null) => void;
  setPagination: (patch: Partial<{ page: number; pageSize: number }>) => void;
  completeSuccess: (data: ReportQueryResponse) => void;
  completeError: (message: string) => void;
  finishCancelled: () => void;
  clearResults: () => void;
  exportDisplayedReport: (format: ReportExportFormat, fileName?: string) => Promise<boolean>;
  loadReportPage: (page: number, pageSize: number) => Promise<void>;
};

const resetRunMetrics = {
  progress: 0,
  loaded: 0,
  total: 0,
  runStartedAt: null as number | null,
};

export const reportGenerationStore = create<ReportGenerationState>()((set, get) => ({
  isGenerating: false,
  isExporting: false,
  isLoadingPage: false,
  progress: 0,
  loaded: 0,
  total: 0,
  runStartedAt: null,
  lastResult: null,
  queryContext: null,
  pagination: { page: 0, pageSize: DEFAULT_REPORT_PAGE_SIZE },
  sort: [] as string[],

  setSort: (sort) => {
    const current = get().sort;
    if (
      current.length === sort.length &&
      current.every((value, index) => value === sort[index])
    ) {
      return;
    }
    set({ sort });
  },

  prepareNewReportView: () =>
    set({
      lastResult: null,
      queryContext: null,
      pagination: { page: 0, pageSize: get().pagination.pageSize },
      sort: [] as string[],
    }),

  start: () => {
    reportFetchAbortController?.abort();
    reportFetchAbortController = new AbortController();
    set({
      isGenerating: true,
      isLoadingPage: false,
      lastResult: null,
      progress: 0,
      loaded: 0,
      total: 0,
      runStartedAt: Date.now(),
    });
  },

  getAbortSignal: () => reportFetchAbortController?.signal,

  abortRun: () => {
    reportFetchAbortController?.abort();
  },

  setProgress: (loaded, total) => {
    const pct = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
    set((state) => ({
      progress: pct,
      loaded,
      total,
      runStartedAt: state.runStartedAt ?? Date.now(),
    }));
  },

  setQueryContext: (context) => set({ queryContext: context }),

  setPagination: (patch) => {
    const current = get().pagination;
    const next = { ...current, ...patch };
    if (next.page === current.page && next.pageSize === current.pageSize) {
      return;
    }
    set({ pagination: next });
  },

  completeSuccess: (data) => {
    reportFetchAbortController = null;
    const pageLoaded = data.content?.length ?? 0;
    const totalElements = data.totalElements ?? pageLoaded;
    const pageIndex = typeof data.number === 'number' ? data.number : get().pagination.page;

    const prevContext = get().queryContext;
    let queryContext = prevContext;
    if (prevContext && data.content?.length) {
      const columnHeaderLabels =
        prevContext.columnHeaderLabels ??
        (() => {
          const rs = reportsStore.getState();
          return buildReportColumnHeaderLabels(
            data.content,
            rs.metadata,
            prevContext.body,
            rs.outputRows,
            rs.reportTableFieldsMetadataByRowId,
            rs.referenceEntityMetadataByName,
            rs.entities,
          );
        })();
      queryContext = { ...prevContext, columnHeaderLabels };
    }

    set({
      isGenerating: false,
      isLoadingPage: false,
      lastResult: data,
      queryContext,
      progress: 100,
      loaded: pageLoaded,
      total: totalElements,
      runStartedAt: null,
      pagination: {
        page: pageIndex,
        pageSize: data.size ?? get().pagination.pageSize,
      },
    });
  },

  completeError: (message) => {
    reportFetchAbortController = null;
    enqueueSnackbar(message, { variant: 'error' });
    set({
      isGenerating: false,
      isLoadingPage: false,
      ...resetRunMetrics,
    });
  },

  finishCancelled: () => {
    reportFetchAbortController = null;
    set({
      isGenerating: false,
      isLoadingPage: false,
      ...resetRunMetrics,
    });
  },

  clearResults: () =>
    set({
      lastResult: null,
      queryContext: null,
      pagination: { page: 0, pageSize: get().pagination.pageSize },
      sort: [],
    }),

  async exportDisplayedReport(format, fileName = '') {
    const { queryContext, isGenerating, isExporting } = get();
    if (isGenerating || isExporting) return false;
    if (!queryContext) {
      enqueueSnackbar(i18n.t('reports.noReportToExport'), { variant: 'warning' });
      return false;
    }

    set({ isExporting: true });
    try {
      const blob = await exportReport(
        queryContext.entityName,
        format,
        fileName,
        queryContext.body,
      );
      downloadReportFile(blob, fileName, format);
      enqueueSnackbar(i18n.t('reports.exportSuccess'), { variant: 'success' });
      return true;
    } catch (e) {
      const message =
        e instanceof Error && e.message === REPORT_QUERY_TRANSPORT_ERROR
          ? i18n.t('reports.queryNetworkError')
          : e instanceof Error
            ? e.message
            : i18n.t('reports.exportError');
      enqueueSnackbar(message, { variant: 'error' });
      return false;
    } finally {
      set({ isExporting: false });
    }
  },

  async loadReportPage(page, pageSize) {
    const { queryContext } = get();
    if (!queryContext) return;

    const requestSeq = ++reportPageRequestSeq;

    reportFetchAbortController?.abort();
    reportFetchAbortController = new AbortController();

    set({
      isLoadingPage: true,
      pagination: { page, pageSize },
    });

    try {
      const { sort } = get();
      const result = await executeReportQuery(queryContext.entityName, queryContext.body, {
        page,
        size: pageSize,
        sort,
      });
      if (requestSeq !== reportPageRequestSeq) {
        set({ isLoadingPage: false });
        return;
      }
      get().completeSuccess(result);
    } catch (e) {
      if (requestSeq !== reportPageRequestSeq) {
        return;
      }
      if (e instanceof DOMException && e.name === 'AbortError') {
        set({ isLoadingPage: false });
        return;
      }
      const message =
        e instanceof Error && e.message === REPORT_QUERY_TRANSPORT_ERROR
          ? i18n.t('reports.queryNetworkError')
          : e instanceof Error
            ? e.message
            : i18n.t('reports.loadError');
      get().completeError(message);
    }
  },
}));
