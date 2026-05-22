import { getQuery, postQuery } from '@shared/api/baseQueryTypes';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportQueryPageable,
  ReportQueryRequest,
  ReportQueryResponse,
} from '../types/reportApiTypes';

function unwrap<T>(res: { data: T | null; isError?: boolean; message?: string; detail?: string }): T {
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
  const res = await postQuery<ReportQueryResponse, ReportQueryRequest>({
    url: buildQueryUrl(entityName, pageable),
    data: body,
  });
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'reports query failed');
  }
  return res.data;
}
