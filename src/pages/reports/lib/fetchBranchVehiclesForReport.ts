import { CarsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { ICar } from '@shared/types/BaseQueryTypes';

const PAGE_SIZE = 500;

function extractCarsPage(response: unknown): { content: ICar[]; totalPages?: number; totalElements?: number } {
  if (!response || typeof response !== 'object') {
    return { content: [] };
  }
  const payload = (response as { data?: { content?: ICar[]; totalPages?: number; totalElements?: number } })
    .data;
  return {
    content: payload?.content ?? [],
    totalPages: payload?.totalPages,
    totalElements: payload?.totalElements,
  };
}

/** Список активных ТС текущего филиала (как api/vehicles?…&all.isActive.in=true). */
export async function fetchBranchVehiclesForReport(): Promise<ICar[]> {
  const branchId = appStore.getState().selectedBranchState?.id;
  const baseOptions = {
    limit: PAGE_SIZE,
    filterOptions: branchId != null ? { branchId } : {},
    isActive: true,
  };

  const first = await CarsApi.getCarsList({ ...baseOptions, page: 0 });
  const firstData = extractCarsPage(first);
  const all: ICar[] = [...firstData.content];

  const totalPages = Number(firstData.totalPages);
  const totalElements = Number(firstData.totalElements);
  const maxPages =
    Number.isFinite(totalPages) && totalPages > 1
      ? totalPages
      : Number.isFinite(totalElements) && totalElements > PAGE_SIZE
        ? Math.ceil(totalElements / PAGE_SIZE)
        : 1;

  for (let page = 1; page < maxPages; page++) {
    const response = await CarsApi.getCarsList({ ...baseOptions, page });
    const { content } = extractCarsPage(response);
    all.push(...content);
  }

  return all;
}
