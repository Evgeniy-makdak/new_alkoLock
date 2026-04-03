import { create } from 'zustand';

import type { ReportAggregates } from '../lib/aggregateReportData';

/** Порог предупреждения о большом объёме (количество событий). */
export const REPORT_OVERSIZE_THRESHOLD = 10_000;

let reportFetchAbortController: AbortController | null = null;

type ReportGenerationState = {
  isGenerating: boolean;
  progress: number;
  loaded: number;
  total: number;
  runStartedAt: number | null;
  lastAggregates: ReportAggregates | null;
  lastError: string | null;
  prepareNewReportView: () => void;
  start: () => void;
  getAbortSignal: () => AbortSignal | undefined;
  abortRun: () => void;
  setProgress: (loaded: number, total: number) => void;
  completeSuccess: (data: ReportAggregates) => void;
  completeError: (message: string) => void;
  finishCancelled: () => void;
  clearResults: () => void;
};

const resetRunMetrics = {
  progress: 0,
  loaded: 0,
  total: 0,
  runStartedAt: null as number | null,
};

export const reportGenerationStore = create<ReportGenerationState>()((set) => ({
  isGenerating: false,
  progress: 0,
  loaded: 0,
  total: 0,
  runStartedAt: null,
  lastAggregates: null,
  lastError: null,
  prepareNewReportView: () => set({ lastAggregates: null, lastError: null }),
  start: () => {
    reportFetchAbortController?.abort();
    reportFetchAbortController = new AbortController();
    set({
      isGenerating: true,
      lastError: null,
      lastAggregates: null,
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
  completeSuccess: (data) => {
    reportFetchAbortController = null;
    set({
      isGenerating: false,
      lastAggregates: data,
      lastError: null,
      ...resetRunMetrics,
    });
  },
  completeError: (message) => {
    reportFetchAbortController = null;
    set({
      isGenerating: false,
      lastError: message,
      ...resetRunMetrics,
    });
  },
  finishCancelled: () => {
    reportFetchAbortController = null;
    set({
      isGenerating: false,
      lastError: null,
      ...resetRunMetrics,
    });
  },
  clearResults: () => set({ lastAggregates: null, lastError: null }),
}));
