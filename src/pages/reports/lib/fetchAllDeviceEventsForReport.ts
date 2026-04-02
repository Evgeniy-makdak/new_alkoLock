import { EventsApi } from '@shared/api/baseQuerys';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';

const PAGE_SIZE = 200;

export async function fetchAllDeviceEventsForReport(
  buildOptions: (page: number) => QueryOptions,
): Promise<IDeviceAction[]> {
  const all: IDeviceAction[] = [];
  let page = 0;
  let total = Infinity;

  for (;;) {
    const res = await EventsApi.getList(buildOptions(page));
    if (res.isError) {
      throw new Error(res.message || res.detail || 'device-events request failed');
    }
    const content = res.data?.content ?? [];
    total = Number(res.data?.totalElements ?? 0);
    all.push(...content);
    if (content.length < PAGE_SIZE || all.length >= total) break;
    page += 1;
  }

  return all;
}
