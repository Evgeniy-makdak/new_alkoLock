import axios from 'axios';

import { EventsApi } from '@shared/api/baseQuerys';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';

import { isReportRecordWithAnonymousUser } from './reportAnonymousUser';

const PAGE_SIZE = 200;

export function isReportFetchAbortError(e: unknown): boolean {
  return axios.isAxiosError(e) && e.code === 'ERR_CANCELED';
}

/** Количество событий по тем же фильтрам, что и отчёт (один лёгкий запрос). */
export async function fetchReportEventsTotalCount(
  buildOptions: (page: number) => QueryOptions,
  signal?: AbortSignal,
): Promise<number> {
  const res = await EventsApi.getList(buildOptions(0), signal ? { signal } : undefined);
  if (res.isError) {
    throw new Error(res.message || res.detail || 'device-events request failed');
  }
  return Number(res.data?.totalElements ?? 0);
}

export async function fetchAllDeviceEventsForReport(
  buildOptions: (page: number) => QueryOptions,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<IDeviceAction[]> {
  const all: IDeviceAction[] = [];
  let page = 0;
  let total = Infinity;

  for (;;) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    const res = await EventsApi.getList(buildOptions(page), signal ? { signal } : undefined);
    if (res.isError) {
      throw new Error(res.message || res.detail || 'device-events request failed');
    }
    const content = (res.data?.content ?? []).filter(
      (item) => !isReportRecordWithAnonymousUser(item),
    );
    total = Number(res.data?.totalElements ?? 0);
    all.push(...content);
    onProgress?.(all.length, total);
    if (content.length < PAGE_SIZE || all.length >= total) break;
    page += 1;
  }

  return all;
}
