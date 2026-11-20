import { AlcolocksApi, EventsApi } from '@shared/api/baseQuerys';
import { appStore } from '@shared/model/app_store/AppStore';
import type { IDeviceAction } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import { fetchBranchOfficesForReport } from './branchOfficeReportOptions';
import { buildDomainListValuesForAttribute } from './buildDomainListValuesForAttribute';
import { fetchAllReportReferencePages } from './fetchAllReportReferencePages';
import { fetchVehicleDriverAllotmentsForReportFilter } from './fetchVehicleDriverAllotmentsForReportFilter';
import {
  fetchDriverLicenceClassFilterValueOptions,
  isReportDriverLicenceClassAttribute,
} from './fetchDriverLicenceClassOptions';
import {
  SERVICE_HISTORY_RESULT_REFERENCE_ENTITY,
  fetchEventClassesForReport,
  fetchEventTypesForReport,
  fetchEventsForFrontFilterValueOptions,
  fetchServiceHistoryResultFilterValueOptions,
  isEventsForFrontLevelAttribute,
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

function buildDeviceModeValues(raw: unknown, searchQuery: string): Values {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const values: Values = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') continue;
    const option = item as { value?: unknown; label?: unknown; key?: unknown };
    const rawValue = option.value ?? option.key;
    if (rawValue == null || rawValue === '') continue;
    const value = String(rawValue);
    if (seen.has(value)) continue;
    seen.add(value);
    values.push({
      value,
      label: String(option.label ?? rawValue),
    });
  }

  const match = Formatters.removeExtraSpaces(searchQuery ?? '').toLowerCase();
  return match
    ? values.filter((option) => String(option.label).toLowerCase().includes(match))
    : values;
}

/** GET api/v1/front-data/device-mode — полный справочник режимов алкозамка. */
async function fetchDeviceModeOptions(searchQuery: string): Promise<Values> {
  const res = await AlcolocksApi.getDeviceModes();
  if (res.isError || res.data == null) {
    throw new Error(res.message || res.detail || 'report device-mode failed');
  }
  return buildDeviceModeValues(res.data, searchQuery);
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

  // «Алкозамок» -> «Режим»: значения только из front-data/device-mode.
  const attrLeaf = attr.includes('.') ? attr.slice(attr.lastIndexOf('.') + 1) : attr;
  if (ref === 'MonitoringDevice' && attrLeaf === 'mode') {
    return fetchDeviceModeOptions(searchQuery);
  }

  // «Водитель → Категории ВУ»: front-data/driver-licence-class
  // (и при leaf User/Driver, и по маркеру — не список водителей/пользователей).
  if (isReportDriverLicenceClassAttribute(attr)) {
    return fetchDriverLicenceClassFilterValueOptions(searchQuery);
  }

  // «Тип результата → Результат» (AutoServiceHistory): service-history-event-types,
  // не общие event-types типов событий устройства.
  if (ref === SERVICE_HISTORY_RESULT_REFERENCE_ENTITY) {
    return fetchServiceHistoryResultFilterValueOptions(searchQuery);
  }

  if (shouldUseEventsForFrontTypeListApi(ref, field)) {
    return fetchEventsForFrontFilterValueOptions(field, searchQuery);
  }

  // «Уровень события» -> «Уровень»: values только из event-classes,
  // независимо от отсутствующей/несовпадающей referenceEntity в листовой метадате.
  if (isEventsForFrontLevelAttribute(attr) || ref === 'LevelsForFront') {
    return fetchEventClassesForReport(searchQuery);
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
