import { EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { getBranchListUrl, getSelectBranchQueryUrl } from '@shared/lib/getUrlForQueries';
import { getQuery } from '@shared/api/baseQueryTypes';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, IBranch, IDeviceAction, IUser } from '@shared/types/BaseQueryTypes';
import type { ID } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { Formatters } from '@shared/utils/formatters';
import type { Values } from '@shared/ui/search_multiple_select';

import { fetchBranchVehiclesForReport } from './fetchBranchVehiclesForReport';

import type { ICar } from '@shared/types/BaseQueryTypes';

const PAGE_SIZE = 500;

function unwrapContent<T>(res: {
  data?: { content?: T[]; totalPages?: number; totalElements?: number } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): { content: T[]; totalPages: number; totalElements: number } {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report reference list failed');
  }
  const content = res.data.content ?? [];
  return {
    content,
    totalPages: Number(res.data.totalPages ?? 1),
    totalElements: Number(res.data.totalElements ?? content.length),
  };
}

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ content: T[]; totalPages: number; totalElements: number }>,
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

function carsToValues(cars: ICar[]): Values {
  return cars.map((car) => ({
    value: car.id,
    label: Formatters.carNameFormatter(car, false, true, false),
  }));
}

function devicesToValues(devices: IAlcolock[]): Values {
  return devices.map((d) => ({
    value: d.id,
    label: [d.name, d.serialNumber != null ? String(d.serialNumber) : ''].filter(Boolean).join(' · ') || String(d.id),
  }));
}

function usersToValues(users: IUser[]): Values {
  return users.map((u) => ({
    value: u.id,
    label: Formatters.nameFormatter(u, false) || String(u.id),
  }));
}

function deviceEventsToValuesForEventType(events: IDeviceAction[]): Values {
  const seen = new Map<string | number, string>();
  for (const ev of events) {
    const ef = ev.eventsForFront as { id?: ID; label?: string } | undefined;
    const id = ef?.id ?? ev.id;
    if (id == null || seen.has(id)) continue;
    const label = ef?.label ?? (ev.eventType && typeof ev.eventType === 'object' ? ev.eventType.label : undefined);
    seen.set(id, label ?? String(id));
  }
  return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
}

function branchesToValues(branches: IBranch[]): Values {
  return branches.map((b) => ({
    value: b.id,
    label: b.name ?? String(b.id),
  }));
}

function actionsToValues(actions: IDeviceAction[]): Values {
  return actions.map((a) => ({
    value: a.id,
    label:
      (a.eventType && typeof a.eventType === 'object' && a.eventType.label) ||
      (typeof a.type === 'string' ? a.type : '') ||
      String(a.id),
  }));
}

/**
 * Список значений для фильтра по полю сущности (referenceEntity из metadata отчёта).
 */
export async function fetchReportReferenceEntityValues(referenceEntity: string): Promise<Values> {
  const ref = (referenceEntity ?? '').trim();
  const branchId = appStore.getState().selectedBranchState?.id;

  switch (ref) {
    case 'Vehicle': {
      const cars = await fetchBranchVehiclesForReport();
      return carsToValues(cars);
    }
    case 'MonitoringDevice': {
      const list = await fetchAllPages(async (page) => {
        const branchQ =
          branchId != null
            ? getSelectBranchQueryUrl({ branchId, page: 'assignment', parameters: '' })
            : '';
        const url = `api/monitoring-devices?page=${page}&size=${PAGE_SIZE}${branchQ}&sort=name&all.id.notIn=3&all.isActive.in=true`;
        const res = await getQuery<{ content: IAlcolock[]; totalPages?: number; totalElements?: number }>({
          url,
        });
        return unwrapContent<IAlcolock>(res);
      });
      return devicesToValues(list);
    }
    case 'User': {
      const base: QueryOptions = {
        page: 0,
        limit: PAGE_SIZE,
        filterOptions: branchId != null ? { branchId } : {},
        query: '&all.isActive.in=true',
      };
      const list = await fetchAllPages(async (page) => {
        const res = await UsersApi.getList({ ...base, page, limit: PAGE_SIZE }, false);
        return unwrapContent<IUser>(res);
      });
      return usersToValues(list);
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
      return deviceEventsToValuesForEventType(list);
    }
    case 'BranchOffice': {
      const base: QueryOptions = {
        page: 0,
        limit: PAGE_SIZE,
        filterOptions: branchId != null ? { branchId } : {},
      };
      const list = await fetchAllPages(async (page) => {
        const url = getBranchListUrl({ ...base, page, limit: PAGE_SIZE });
        const res = await getQuery<{ content: IBranch[]; totalPages?: number; totalElements?: number }>({ url });
        return unwrapContent<IBranch>(res);
      });
      return branchesToValues(list);
    }
    case 'DeviceAction': {
      const list = await fetchAllPages(async (page) => {
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
        const res = await getQuery<{ content: IDeviceAction[]; totalPages?: number; totalElements?: number }>({
          url,
        });
        return unwrapContent<IDeviceAction>(res);
      });
      return actionsToValues(list);
    }
    default:
      return [];
  }
}
