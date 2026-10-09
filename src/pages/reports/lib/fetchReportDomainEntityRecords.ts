import { AlcolocksApi, CarsApi, EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, ICar, IDeviceAction, IUser } from '@shared/types/BaseQueryTypes';
import { Formatters } from '@shared/utils/formatters';

import { normalizeReportBranchIds } from './buildReportBranchQueryParams';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';

/** Сущности, чьи «Значения» (в т.ч. id) грузятся доменным API из отчётов. */
export type ReportDomainListEntity =
  | 'DeviceEvent'
  | 'Vehicle'
  | 'User'
  | 'Driver'
  | 'MonitoringDevice';

export function isReportDomainListEntityName(name: string): name is ReportDomainListEntity {
  const n = (name ?? '').trim();
  return (
    n === 'DeviceEvent' ||
    n === 'Vehicle' ||
    n === 'User' ||
    n === 'Driver' ||
    n === 'MonitoringDevice'
  );
}

/**
 * Корень пути поля отчёта → сущность справочника.
 * id / timestamp → DeviceEvent; vehicle.* → Vehicle; user.* → User; device.* → MonitoringDevice.
 */
export function resolveReportDomainListEntityForFieldPath(
  fieldPath: string,
  rootEntityName: string,
): ReportDomainListEntity | null {
  const path = (fieldPath ?? '').trim();
  const root = (rootEntityName ?? '').trim();
  if (!path) return null;

  const leaf = path.includes('.') ? path.slice(path.lastIndexOf('.') + 1) : path;
  const head = path.includes('.') ? path.slice(0, path.indexOf('.')) : '';

  if (head === 'vehicle' || head === 'vehicleRecord') return 'Vehicle';
  if (head === 'user' || head === 'userRecord') return 'User';
  if (head === 'device' || head === 'deviceRecord') return 'MonitoringDevice';
  if (head === 'eventsForFront') return null;

  if (root === 'DeviceEvent' || root === 'Vehicle' || root === 'User' || root === 'MonitoringDevice') {
    if (!head) {
      if (root === 'DeviceEvent') return 'DeviceEvent';
      if (root === 'Vehicle') return 'Vehicle';
      if (root === 'User') return 'User';
      if (root === 'MonitoringDevice') return 'MonitoringDevice';
    }
  }

  if (leaf === 'id' && !head && root === 'DeviceEvent') return 'DeviceEvent';

  return isReportDomainListEntityName(root) ? root : null;
}

export type FetchReportDomainEntityRecordsParams = {
  entityName: string;
  searchQuery?: string;
  branchIds?: Array<number | string | null | undefined>;
  signal?: AbortSignal;
  /** По умолчанию одна страница size=25 (как в URL из ТЗ). */
  page?: number;
  limit?: number;
};

function resolveBranchId(
  branchIds: Array<number | string | null | undefined> | undefined,
): number | string | undefined {
  const selectedBranchId = appStore.getState().selectedBranchState?.id;
  const normalized = normalizeReportBranchIds(
    branchIds?.length
      ? branchIds
      : selectedBranchId != null
        ? [selectedBranchId]
        : [],
  );
  if (normalized.length === 1) return normalized[0];
  if (normalized.length === 0 && selectedBranchId != null) return selectedBranchId;
  return normalized[0];
}

/**
 * Первая страница справочника для «Значения» фильтров/группировки отчётов.
 *
 * - DeviceEvent: api/device-events?…&all.branch.id.in=…&sort=timestamp,DESC&all.isActive.in=true&sort=id,DESC
 * - Vehicle: api/vehicles?…&all.assignment.branch.id.in=…&sort=manufacturer,model,registrationNumber
 * - User: api/users?…&all.assignment.branch.id.in=…&sort=surname,firstName,middleName,ASC
 * - MonitoringDevice: api/monitoring-devices?…&all.assignment.branch.id.in=…&sort=name&all.id.notIn=3
 */
export async function fetchReportDomainEntityRecords(
  params: FetchReportDomainEntityRecordsParams,
): Promise<unknown[]> {
  const entityName = (params.entityName ?? '').trim();
  if (!isReportDomainListEntityName(entityName) && entityName !== 'Driver') return [];

  const match = Formatters.removeExtraSpaces(params.searchQuery ?? '');
  const page = params.page ?? 0;
  const limit = params.limit ?? REPORT_REFERENCE_LIST_PAGE_SIZE;
  const branchId = resolveBranchId(params.branchIds);
  const branchFilter = branchId != null ? { branchId } : {};
  const axiosConfig = params.signal ? { signal: params.signal } : undefined;

  switch (entityName) {
    case 'DeviceEvent': {
      const res = await EventsApi.getList(
        {
          page,
          limit,
          searchQuery: match,
          filterOptions: branchFilter,
          query: '&all.isActive.in=true',
        },
        axiosConfig,
      );
      if (res.isError) {
        throw new Error(res.message || res.detail || 'device-events request failed');
      }
      return Array.isArray(res.data?.content) ? res.data.content : [];
    }
    case 'Vehicle': {
      const res = await CarsApi.getCarsList({
        page,
        limit,
        searchQuery: match,
        filterOptions: branchFilter,
      });
      if (res.isError) {
        throw new Error(res.message || res.detail || 'vehicles request failed');
      }
      return Array.isArray(res.data?.content) ? (res.data.content as ICar[]) : [];
    }
    case 'User':
    case 'Driver': {
      const res = await UsersApi.getList(
        {
          page,
          limit,
          searchQuery: match,
          filterOptions: {
            ...branchFilter,
            ...(entityName === 'Driver' ? { driverSpecified: true } : {}),
          },
        },
        false,
      );
      if (res.isError) {
        throw new Error(res.message || res.detail || 'users request failed');
      }
      return Array.isArray(res.data?.content) ? (res.data.content as IUser[]) : [];
    }
    case 'MonitoringDevice': {
      // api/monitoring-devices?…&all.assignment.branch.id.in=…&sort=name&all.id.notIn=3
      const res = await AlcolocksApi.getListAlcolocks({
        page,
        limit,
        searchQuery: match,
        filterOptions: branchFilter,
      });
      if (res.isError) {
        throw new Error(res.message || res.detail || 'monitoring-devices request failed');
      }
      return Array.isArray(res.data?.content) ? (res.data.content as IAlcolock[]) : [];
    }
    default:
      return [];
  }
}

/** Для типов, где нужен IDeviceAction[]. */
export async function fetchReportDeviceEventRecords(
  params: Omit<FetchReportDomainEntityRecordsParams, 'entityName'>,
): Promise<IDeviceAction[]> {
  return (await fetchReportDomainEntityRecords({
    ...params,
    entityName: 'DeviceEvent',
  })) as IDeviceAction[];
}
