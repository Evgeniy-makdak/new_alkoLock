import { EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { getBranchListUrl, getSelectBranchQueryUrl } from '@shared/lib/getUrlForQueries';
import { getQuery } from '@shared/api/baseQueryTypes';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, IBranch, IDeviceAction, IUser } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';

import { fetchBranchVehiclesForReport } from './fetchBranchVehiclesForReport';

import type { ICar } from '@shared/types/BaseQueryTypes';

const PAGE_SIZE = 500;

function unwrapContent<T>(res: {
  data?: { content?: T[]; totalPages?: number; totalElements?: number } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): { content: T[]; totalPages: number } {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report reference list failed');
  }
  return {
    content: res.data.content ?? [],
    totalPages: Number(res.data.totalPages ?? 1),
  };
}

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ content: T[]; totalPages: number }>,
): Promise<T[]> {
  const first = await fetchPage(0);
  const all = [...first.content];
  const totalPages = Number.isFinite(first.totalPages) && first.totalPages > 0 ? first.totalPages : 1;
  for (let page = 1; page < totalPages; page++) {
    const next = await fetchPage(page);
    all.push(...next.content);
  }
  return all;
}

/** Сырые записи вложенной сущности (для списка сущностей и значений по свойствам). */
export async function fetchReportReferenceEntityRecords(referenceEntity: string): Promise<unknown[]> {
  const ref = (referenceEntity ?? '').trim();
  const branchId = appStore.getState().selectedBranchState?.id;

  switch (ref) {
    case 'Vehicle':
      return fetchBranchVehiclesForReport();
    case 'MonitoringDevice': {
      return fetchAllPages(async (page) => {
        const branchQ =
          branchId != null
            ? getSelectBranchQueryUrl({ branchId, page: 'assignment', parameters: '' })
            : '';
        const url = `api/monitoring-devices?page=${page}&size=${PAGE_SIZE}${branchQ}&sort=name&all.id.notIn=3&all.isActive.in=true`;
        const res = await getQuery<{ content: IAlcolock[]; totalPages?: number }>({ url });
        return unwrapContent<IAlcolock>(res);
      });
    }
    case 'User': {
      const base: QueryOptions = {
        page: 0,
        limit: PAGE_SIZE,
        filterOptions: branchId != null ? { branchId } : {},
        query: '&all.isActive.in=true',
      };
      return fetchAllPages(async (page) => {
        const res = await UsersApi.getList({ ...base, page, limit: PAGE_SIZE }, false);
        return unwrapContent<IUser>(res);
      });
    }
    case 'EventsForFront': {
      const base: QueryOptions = {
        page: 0,
        limit: PAGE_SIZE,
        filterOptions: branchId != null ? { branchId } : {},
      };
      const list = await fetchAllPages(async (page) => {
        const res = await EventsApi.getList({ ...base, page, limit: PAGE_SIZE });
        return unwrapContent<IDeviceAction>(res);
      });
      return list.map((ev) => {
        const ef = (ev as IDeviceAction).eventsForFront as { id?: unknown; label?: string } | undefined;
        return {
          id: ef?.id ?? ev.id,
          label: ef?.label ?? (typeof ev.eventType === 'object' ? ev.eventType?.label : undefined),
        };
      });
    }
    case 'BranchOffice': {
      const base: QueryOptions = {
        page: 0,
        limit: PAGE_SIZE,
        filterOptions: branchId != null ? { branchId } : {},
      };
      return fetchAllPages(async (page) => {
        const url = getBranchListUrl({ ...base, page, limit: PAGE_SIZE });
        const res = await getQuery<{ content: IBranch[]; totalPages?: number }>({ url });
        return unwrapContent<IBranch>(res);
      });
    }
    case 'DeviceAction': {
      return fetchAllPages(async (page) => {
        const branchQ =
          branchId != null
            ? getSelectBranchQueryUrl({
                branchId,
                page: 'device',
                useAssignmentPrefix: true,
                parameters: '',
              })
            : '';
        const url = `api/device-actions?page=${page}&size=${PAGE_SIZE}${branchQ}&sort=timestamp,DESC`;
        const res = await getQuery<{ content: IDeviceAction[]; totalPages?: number }>({ url });
        return unwrapContent<IDeviceAction>(res);
      });
    }
    default:
      return [];
  }
}
