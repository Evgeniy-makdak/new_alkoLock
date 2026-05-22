import { EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { getBranchListUrl, getSelectBranchQueryUrl } from '@shared/lib/getUrlForQueries';
import { getQuery } from '@shared/api/baseQueryTypes';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, IBranch, IDeviceAction, IUser } from '@shared/types/BaseQueryTypes';
import type { QueryOptions } from '@shared/types/QueryTypes';
import { Formatters } from '@shared/utils/formatters';
import type { Values } from '@shared/ui/search_multiple_select';

import { fetchReportNestedEntitySearchOptions } from './fetchReportNestedEntitySearchOptions';
import { isReportReferenceEntityServerSearch } from './reportReferenceEntityServerSearch';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

function unwrapContent<T>(res: {
  data?: { content?: T[]; totalPages?: number; totalElements?: number } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): { content: T[] } {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report reference list failed');
  }
  return {
    content: res.data.content ?? [],
  };
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
    const ef = ev.eventsForFront as { id?: unknown; label?: string } | undefined;
    const id = ef?.id ?? ev.id;
    if (id == null || seen.has(id as string | number)) continue;
    const label = ef?.label ?? (ev.eventType && typeof ev.eventType === 'object' ? ev.eventType.label : undefined);
    seen.set(id as string | number, label ?? String(id));
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
  if (!ref) return [];

  if (isReportReferenceEntityServerSearch(ref)) {
    return fetchReportNestedEntitySearchOptions(ref, 'id', '');
  }

  const branchId = appStore.getState().selectedBranchState?.id;
  const pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE;

  switch (ref) {
    case 'BranchOffice': {
      const base: QueryOptions = {
        page: 0,
        limit: pageSize,
        filterOptions: branchId != null ? { branchId } : {},
      };
      const url = getBranchListUrl(base);
      const res = await getQuery<{ content: IBranch[] }>({ url });
      return branchesToValues(unwrapContent<IBranch>(res).content);
    }
    case 'DeviceAction': {
      const branchQ =
        branchId != null
          ? getSelectBranchQueryUrl({
              branchId,
              page: 'device',
              useAssignmentPrefix: true,
              parameters: '',
            })
          : '';
      const url = `api/device-actions?page=0&size=${pageSize}${branchQ}&sort=timestamp,DESC`;
      const res = await getQuery<{ content: IDeviceAction[] }>({ url });
      return actionsToValues(unwrapContent<IDeviceAction>(res).content);
    }
    default:
      return [];
  }
}
