import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

import { CarsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ICar } from '@shared/types/BaseQueryTypes';

function extractCarsPage(response: unknown): { content: ICar[] } {
  if (!response || typeof response !== 'object') {
    return { content: [] };
  }
  const payload = (response as { data?: { content?: ICar[] } }).data;
  return {
    content: payload?.content ?? [],
  };
}

/** Первая страница активных ТС текущего филиала (для устаревших вызовов без серверного поиска). */
export async function fetchBranchVehiclesForReport(): Promise<ICar[]> {
  const branchId = appStore.getState().selectedBranchState?.id;
  const response = await CarsApi.getCarsList({
    page: 0,
    limit: REPORT_REFERENCE_LIST_PAGE_SIZE,
    filterOptions: branchId != null ? { branchId } : {},
    isActive: true,
  });
  return extractCarsPage(response).content;
}
