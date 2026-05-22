import { AlcolocksApi, CarsApi, EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IAlcolock, ICar, IUser } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import {
  branchOfficeValuesForAttribute,
  fetchBranchOfficesForReport,
} from './branchOfficeReportOptions';
import {
  buildDeviceActionAttributeOptions,
  buildDeviceActionDevicePickerOptions,
  buildDeviceActionUserPickerOptions,
  fetchDeviceActionsForReport,
  isDeviceActionDeviceAttribute,
  isDeviceActionUserAttribute,
} from './deviceActionReportOptions';
import {
  buildNestedEntityAttributeOptions,
  recordsToEntityListValues,
} from './buildNestedEntityAttributeOptions';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import {
  isNestedEntityListPickerField,
  resolveNestedEntityValueLoadKind,
} from './reportNestedEntityValueOptions';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';
import type { ReportFieldDefinition } from '../types/reportApiTypes';

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

/**
 * Опции «Значение (параметр)» — page=0&size=20, при вводе &all.match.contains=… (как алкозамки).
 */
export async function fetchReportNestedEntityValueOptions(
  referenceEntity: string,
  field: ReportFieldDefinition,
  searchQuery: string,
  labelMaps?: ReportVehicleLabelMaps,
): Promise<Values> {
  const ref = (referenceEntity ?? '').trim();
  const attr = (field.fieldName ?? '').trim();
  if (!ref || !attr) return [];

  const kind = resolveNestedEntityValueLoadKind(field, ref, attr);
  if (kind === 'static' || kind === 'dateTime') {
    return [];
  }
  if (kind === 'frontDataEnum') {
    return buildNestedEntityAttributeOptions([], ref, attr, labelMaps);
  }

  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
  const listPicker = isNestedEntityListPickerField(field, attr);
  const branchId = appStore.getState().selectedBranchState?.id;
  const pageOpts = {
    page: 0,
    limit: REPORT_REFERENCE_LIST_PAGE_SIZE,
    searchQuery: match,
    filterOptions: branchId != null ? { branchId } : {},
  };

  switch (ref) {
    case 'BranchOffice': {
      const offices = await fetchBranchOfficesForReport(match);
      return branchOfficeValuesForAttribute(offices, attr, listPicker);
    }
    case 'DeviceAction': {
      const actions = await fetchDeviceActionsForReport(match);
      if (listPicker && isDeviceActionDeviceAttribute(attr)) {
        return buildDeviceActionDevicePickerOptions(actions);
      }
      if (listPicker && isDeviceActionUserAttribute(attr)) {
        return buildDeviceActionUserPickerOptions(actions);
      }
      if (listPicker) {
        return recordsToEntityListValues(ref, actions);
      }
      return buildDeviceActionAttributeOptions(actions, attr);
    }
    case 'Vehicle': {
      const res = await CarsApi.getCarsList({ ...pageOpts, isActive: true });
      const cars = unwrapList<ICar>(res);
      if (listPicker) {
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
      if (listPicker) {
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
      if (listPicker) {
        return recordsToEntityListValues(ref, users);
      }
      if (attr === 'fullName') {
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
      if (field.fieldName === 'label') {
        return types
          .filter((item) => item.label != null && item.label !== '')
          .map((item) => ({ value: String(item.label), label: String(item.label) }));
      }
      return types
        .filter((item) => item.id != null)
        .map((item) => ({
          value: item.id as number | string,
          label: item.label ?? String(item.id),
        }));
    }
    default:
      return [];
  }
}

/** @deprecated Используйте fetchReportNestedEntityValueOptions */
export const fetchReportNestedEntitySearchOptions = fetchReportNestedEntityValueOptions;
