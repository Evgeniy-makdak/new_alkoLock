import axios from 'axios';

import { getApiUrl, getQuery, postQuery, returnHeaders } from '@shared/api/baseQueryTypes';

import type { AppAxiosResponse } from '@shared/api/baseQueryTypes';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportQueryPageable,
  ReportQueryRequest,
  ReportQueryResponse,
} from '../types/reportApiTypes';

/** Сигнал для UI: обрыв ответа (ERR_HTTP2_PROTOCOL_ERROR и т.п.), не ошибка бизнес-логики. */
export const REPORT_QUERY_TRANSPORT_ERROR = 'REPORT_QUERY_TRANSPORT_ERROR';

const REPORT_QUERY_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Нет HTTP-статуса — тело JSON не дошло до axios (типично ERR_HTTP2_PROTOCOL_ERROR в DevTools). */
function isLikelyTransportFailure(res: AppAxiosResponse<unknown>): boolean {
  if (!res.isError) return false;
  if (res.status != null && res.status >= 400) return false;
  return res.status === 0 || res.data == null;
}

function unwrap<T>(res: {
  data: T | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'reports request failed');
  }
  return res.data;
}

function buildQueryUrl(entityName: string, pageable?: ReportQueryPageable): string {
  const encoded = encodeURIComponent(entityName);
  const base = `api/v1/reports/${encoded}/query`;
  if (!pageable) {
    return base;
  }
  const queryParts = [`page=${pageable.page}`, `size=${pageable.size}`];
  for (const sort of pageable.sort ?? []) {
    if (sort) {
      queryParts.push(`sort=${sort}`);
    }
  }
  return `${base}?${queryParts.join('&')}`;
}

export async function fetchReportEntities(): Promise<ReportEntityListItem[]> {
  const res = await getQuery<ReportEntityListItem[]>({
    url: 'api/v1/reports/entities',
  });
  const data = unwrap(res);
  return Array.isArray(data) ? data : [];
}

export async function fetchReportEntityMetadata(entityName: string): Promise<ReportEntityMetadata> {
  const encoded = encodeURIComponent(entityName);
  const res = await getQuery<ReportEntityMetadata>({
    url: `api/v1/reports/${encoded}/metadata`,
  });
  return unwrap(res);
}

export async function executeReportQuery(
  entityName: string,
  body: ReportQueryRequest,
  pageable?: ReportQueryPageable,
): Promise<ReportQueryResponse> {
  const url = buildQueryUrl(entityName, pageable);
  let lastRes: AppAxiosResponse<ReportQueryResponse> | null = null;

  for (let attempt = 0; attempt < REPORT_QUERY_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await delay(400 * attempt);
    }

    const res = await postQuery<ReportQueryResponse, ReportQueryRequest>({
      url,
      data: body,
    });

    if (!res.isError && res.data != null) {
      return res.data;
    }

    lastRes = res;
    if (!isLikelyTransportFailure(res) || attempt >= REPORT_QUERY_ATTEMPTS - 1) {
      break;
    }
  }

  if (lastRes && isLikelyTransportFailure(lastRes)) {
    throw new Error(REPORT_QUERY_TRANSPORT_ERROR);
  }

  throw new Error(lastRes?.detail || lastRes?.message || 'reports query failed');
}

export type ReportExportFormat = 'CSV' | 'XLS' | 'PDF';

export async function exportReport(
  entityName: string,
  format: ReportExportFormat,
  fileName: string,
  body: ReportQueryRequest,
): Promise<Blob> {
  const encoded = encodeURIComponent(entityName);
  const queryParts = [`format=${encodeURIComponent(format)}`];
  if (fileName.trim()) {
    queryParts.push(`fileName=${encodeURIComponent(fileName.trim())}`);
  }
  const url = `${getApiUrl()}api/v1/reports/${encoded}/export?${queryParts.join('&')}`;

  const res = await axios.post(url, body, {
    headers: returnHeaders(),
    responseType: 'blob',
  });

  if (res.status >= 400) {
    throw new Error('report export failed');
  }
  return res.data as Blob;
}
