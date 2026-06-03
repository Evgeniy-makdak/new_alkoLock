import { EventsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { buildCoordinatePairValueOptions } from './reportCoordinateComposite';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

/** Имя сущности отчёта «Отчёт по событиям» в metadata. */
export const DEVICE_EVENT_REPORT_ENTITY = 'DeviceEvent';

export function isDeviceEventReportEntity(entityName: string): boolean {
  return (entityName ?? '').trim() === DEVICE_EVENT_REPORT_ENTITY;
}

/**
 * Справочник пар координат для фильтра отчёта по событиям.
 * GET api/device-events?page=0&size=25&all.branch.id.in=…&sort=timestamp,DESC&sort=id,DESC
 */
export async function fetchDeviceEventCoordinatePairsForReport(
  searchQuery?: string,
): Promise<Values> {
  const branchId = appStore.getState().selectedBranchState?.id;
  const match = Formatters.removeExtraSpaces(searchQuery ?? '');

  const res = await EventsApi.getList({
    page: 0,
    limit: REPORT_REFERENCE_LIST_PAGE_SIZE,
    searchQuery: match,
    filterOptions: branchId != null ? { branchId } : {},
  });

  if (res.isError || res.data?.content == null) {
    return [];
  }

  const content = res.data.content as IDeviceAction[];
  let options = buildCoordinatePairValueOptions(content);

  if (match) {
    const needle = match.toLowerCase();
    options = options.filter((opt) => String(opt.label).toLowerCase().includes(needle));
  }

  return options;
}
