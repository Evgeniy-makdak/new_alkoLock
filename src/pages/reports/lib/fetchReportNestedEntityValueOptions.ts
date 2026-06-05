import { AlcolocksApi, CarsApi, EventsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type {
  IAlcolock,
  ICar,
  IDeviceAction,
} from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { fetchBranchOfficesForReport } from './branchOfficeReportOptions';
import { buildDomainListValuesForAttribute } from './buildDomainListValuesForAttribute';
import { fetchAllReportReferencePages } from './fetchAllReportReferencePages';
import { fetchVehicleDriverAllotmentsForReportFilter } from './fetchVehicleDriverAllotmentsForReportFilter';
import {
  fetchEventTypesForReport,
  fetchEventsForFrontFilterValueOptions,
  shouldUseEventsForFrontTypeListApi,
} from './eventsForFrontReportOptions';
import { isEntityIdAttribute } from './reportEntityIdAttribute';
import { fetchDeviceActionsForReport } from './deviceActionReportOptions';
import { fetchUsersForReportFilter } from './fetchUsersForReportFilter';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { resolveNestedEntityValueLoadKind } from './reportNestedEntityValueOptions';
import { REPORT_REFERENCE_LIST_PAGE_SIZE } from './reportReferencePageSize';
import type { ReportFieldDefinition } from '../types/reportApiTypes';

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
  const pageSize = REPORT_REFERENCE_LIST_PAGE_SIZE;
  const branchFilter = branchId != null ? { branchId } : {};

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
      const cars = await fetchAllReportReferencePages<ICar>(
        (page) =>
          CarsApi.getCarsList({
            page,
            limit: pageSize,
            searchQuery: match,
            isActive: true,
            filterOptions: branchFilter,
          }),
        pageSize,
      );
      return buildDomainListValuesForAttribute(ref, cars, attr, labelMaps, field);
    }
    case 'MonitoringDevice': {
      const devices = await fetchAllReportReferencePages<IAlcolock>(
        (page) =>
          AlcolocksApi.getList({
            page,
            limit: pageSize,
            searchQuery: match,
            isAttachment: false,
            includeActiveOnly: true,
            query: '&all.id.notIn=3',
            filterOptions: branchFilter,
          }),
        pageSize,
      );
      return buildDomainListValuesForAttribute(ref, devices, attr, labelMaps, field);
    }
    case 'User':
    case 'Driver': {
      const users = await fetchUsersForReportFilter({
        pageSize,
        searchQuery: match,
        branchId: branchId ?? undefined,
        driversOnly: ref === 'Driver',
      });
      return buildDomainListValuesForAttribute(ref, users, attr, labelMaps, field);
    }
    case 'VehicleBind': {
      const binds = await fetchVehicleDriverAllotmentsForReportFilter(match);
      return buildDomainListValuesForAttribute(ref, binds, attr, labelMaps, field);
    }
    case 'AutoServiceHistory': {
      const history = await fetchAllReportReferencePages<IDeviceAction>(
        (page) =>
          EventsApi.getHistoryList({
            page,
            limit: pageSize,
            searchQuery: match,
            filterOptions: branchFilter,
          }),
        pageSize,
      );
      return buildDomainListValuesForAttribute(ref, history, attr, labelMaps, field);
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
