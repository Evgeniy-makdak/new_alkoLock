import { EventsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
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
import {
  fetchReportDomainEntityRecords,
  isReportDomainListEntityName,
} from './fetchReportDomainEntityRecords';
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

  // DeviceEvent / Vehicle / User / MonitoringDevice — page=0&size=25 + поиск по подстроке.
  if (isReportDomainListEntityName(ref) || ref === 'Driver') {
    const records = await fetchReportDomainEntityRecords({
      entityName: ref,
      searchQuery: match,
    });
    return buildDomainListValuesForAttribute(ref, records, attr, labelMaps, field);
  }

  switch (ref) {
    case 'BranchOffice': {
      const offices = await fetchBranchOfficesForReport(match);
      return buildDomainListValuesForAttribute(ref, offices, attr, labelMaps, field);
    }
    case 'DeviceAction': {
      const actions = await fetchDeviceActionsForReport(match);
      return buildDomainListValuesForAttribute(ref, actions, attr, labelMaps, field);
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
