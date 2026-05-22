import { AlcolocksApi, CarsApi, EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, ICar, IUser } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import {
  buildNestedEntityAttributeOptions,
  recordsToEntityListValues,
} from './buildNestedEntityAttributeOptions';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';
import { isReportReferenceEntityServerSearch } from './reportReferenceEntityServerSearch';

function unwrapList<T>(res: {
  data?: T[] | { content?: T[] } | null;
  isError?: boolean;
  message?: string;
  detail?: string;
}): T[] {
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report nested search failed');
  }
  const data = res.data;
  if (Array.isArray(data)) return data;
  return data.content ?? [];
}

/** Опции «Значения» для вложенной сущности: первая страница (20) и поиск по подстроке на API. */
export async function fetchReportNestedEntitySearchOptions(
  referenceEntity: string,
  attribute: string,
  searchQuery: string,
  labelMaps?: ReportVehicleLabelMaps,
): Promise<Values> {
  const ref = (referenceEntity ?? '').trim();
  const attr = (attribute ?? '').trim();
  if (!ref || !attr || !isReportReferenceEntityServerSearch(ref)) {
    return [];
  }

  if (ref === 'Vehicle' && (attr === 'type' || attr === 'color')) {
    return buildNestedEntityAttributeOptions([], ref, attr, labelMaps);
  }

  const branchId = appStore.getState().selectedBranchState?.id;
  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
  const pageOpts = {
    page: 0,
    limit: REPORT_REFERENCE_LIST_PAGE_SIZE,
    searchQuery: match,
    filterOptions: branchId != null ? { branchId } : {},
  };

  switch (ref) {
    case 'Vehicle': {
      const res = await CarsApi.getCarsList({ ...pageOpts, isActive: true });
      const cars = unwrapList<ICar>(res);
      if (attr === 'id') {
        return recordsToEntityListValues(ref, cars);
      }
      return buildNestedEntityAttributeOptions(cars, ref, attr, labelMaps);
    }
    case 'MonitoringDevice': {
      const res = await AlcolocksApi.getList({
        ...pageOpts,
        query: '&all.id.notIn=3&all.isActive.in=true',
      });
      const devices = unwrapList<IAlcolock>(res);
      if (attr === 'id') {
        return recordsToEntityListValues(ref, devices);
      }
      return buildNestedEntityAttributeOptions(devices, ref, attr, labelMaps);
    }
    case 'User': {
      const res = await UsersApi.getListToAttachments(
        { ...pageOpts, isAttachment: true },
        false,
      );
      const users = unwrapList<IUser>(res);
      if (attr === 'id' || attr === 'fullName') {
        if (attr === 'id') {
          return recordsToEntityListValues(ref, users);
        }
        return users
          .map((u) => {
            const label =
              (typeof u.fullName === 'string' && u.fullName.trim()) ||
              Formatters.nameFormatter(u, false) ||
              String(u.id);
            return { value: label, label };
          })
          .filter((item, index, arr) => arr.findIndex((x) => x.value === item.value) === index);
      }
      return buildNestedEntityAttributeOptions(users, ref, attr, labelMaps);
    }
    case 'EventsForFront': {
      const res = await EventsApi.getEventsTypeList(
        { filterOptions: { match } },
        [63],
        false,
        false,
      );
      const types = unwrapList<{ id?: number | string; label?: string }>(res);
      if (attr === 'label') {
        return types
          .filter((t) => t.label != null && t.label !== '')
          .map((t) => ({ value: String(t.label), label: String(t.label) }));
      }
      return types
        .filter((t) => t.id != null)
        .map((t) => ({
          value: t.id as number | string,
          label: t.label ?? String(t.id),
        }));
    }
    default:
      return [];
  }
}
