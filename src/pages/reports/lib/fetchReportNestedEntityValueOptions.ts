import { AlcolocksApi, AttachmentsApi, CarsApi, EventsApi, UsersApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type {
  IAlcolock,
  IAttachmentItems,
  ICar,
  IDeviceAction,
  IUser,
} from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { fetchBranchOfficesForReport } from './branchOfficeReportOptions';
import { buildDomainListValuesForAttribute } from './buildDomainListValuesForAttribute';
import {
  fetchEventTypesForReport,
  fetchEventsForFrontFilterValueOptions,
  shouldUseEventsForFrontTypeListApi,
} from './eventsForFrontReportOptions';
import { isEntityIdAttribute } from './reportEntityIdAttribute';
import { fetchDeviceActionsForReport } from './deviceActionReportOptions';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { resolveNestedEntityValueLoadKind } from './reportNestedEntityValueOptions';
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
 * Опции «Значение» для листового поля (referenceEntity === null) — доменный API по типу сущности.
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

  if (shouldUseEventsForFrontTypeListApi(ref, field)) {
    return fetchEventsForFrontFilterValueOptions(field, searchQuery);
  }

  const kind = resolveNestedEntityValueLoadKind(field, ref);
  if (kind !== 'domainList') {
    return [];
  }

  const match = Formatters.removeExtraSpaces(searchQuery ?? '');
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
      return buildDomainListValuesForAttribute(ref, offices, attr, labelMaps, field);
    }
    case 'DeviceAction': {
      const actions = await fetchDeviceActionsForReport(match);
      return buildDomainListValuesForAttribute(ref, actions, attr, labelMaps, field);
    }
    case 'Vehicle': {
      const res = await CarsApi.getCarsList({ ...pageOpts, limit: 20, isActive: true });
      return buildDomainListValuesForAttribute(ref, unwrapList<ICar>(res), attr, labelMaps, field);
    }
    case 'MonitoringDevice': {
      const res = await AlcolocksApi.getList({
        ...pageOpts,
        limit: 20,
        isAttachment: false,
        includeActiveOnly: true,
        query: '&all.id.notIn=3',
      });
      return buildDomainListValuesForAttribute(ref, unwrapList<IAlcolock>(res), attr, labelMaps, field);
    }
    case 'User':
    case 'Driver': {
      const res = await UsersApi.getListToAttachments(
        {
          ...pageOpts,
          limit: 20,
          isAttachment: true,
          filterOptions: {
            ...pageOpts.filterOptions,
            ...(ref === 'Driver' ? { driverSpecified: true } : {}),
          },
        },
        false,
      );
      return buildDomainListValuesForAttribute(ref, unwrapList<IUser>(res), attr, labelMaps, field);
    }
    case 'VehicleBind': {
      const res = await AttachmentsApi.getList(pageOpts);
      return buildDomainListValuesForAttribute(ref, unwrapList<IAttachmentItems>(res), attr, labelMaps, field);
    }
    case 'AutoServiceHistory': {
      const res = await EventsApi.getHistoryList({
        page: pageOpts.page,
        limit: pageOpts.limit,
        searchQuery: match,
        filterOptions: branchId != null ? { branchId } : {},
      });
      return buildDomainListValuesForAttribute(ref, unwrapList<IDeviceAction>(res), attr, labelMaps, field);
    }
    case 'EventsForFront': {
      if (isEntityIdAttribute(attr)) {
        const types = await fetchEventTypesForReport(match);
        return buildDomainListValuesForAttribute(ref, types, attr, labelMaps, field);
      }
      return fetchEventsForFrontFilterValueOptions(field, match);
    }
    default:
      return [];
  }
}

export const fetchReportNestedEntitySearchOptions = fetchReportNestedEntityValueOptions;
