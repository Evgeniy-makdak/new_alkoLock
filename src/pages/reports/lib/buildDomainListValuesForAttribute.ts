import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

import {
  buildCoordinatePairValueOptions,
  isReportCoordinatesCompositePropertyFieldName,
} from './reportCoordinateComposite';
import {
  buildNestedEntityAttributeOptions,
  recordsToEntityListValues,
  recordsToIdOnlyListValues,
} from './buildNestedEntityAttributeOptions';
import { isDomainEntityReferencePicker } from './reportDomainEntityPicker';
import type { ReportFieldDefinition } from '../types/reportApiTypes';
import {
  buildDeviceActionAttributeOptions,
  buildDeviceActionDevicePickerOptions,
  buildDeviceActionUserPickerOptions,
  isDeviceActionDeviceAttribute,
  isDeviceActionUserAttribute,
} from './deviceActionReportOptions';
import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import type { IUser } from '@shared/types/BaseQueryTypes';
import { isEntityIdAttribute } from './reportEntityIdAttribute';
import { filterReportReferenceRecordsForUi } from './reportAnonymousUser';
import {
  buildReportVehicleCarValueOptions,
  isReportVehicleCarDisplayAttribute,
} from './reportVehicleBindLabel';

/** Имя скалярного поля в записи API (user.phone → phone на корне User). */
function resolveDomainScalarAttribute(referenceEntity: string, attribute: string): string {
  const attr = (attribute ?? '').trim();
  if (!attr.includes('.')) return attr;
  const entity = (referenceEntity ?? '').trim();
  if (entity === 'User' || entity === 'Driver') {
    return attr.slice(attr.lastIndexOf('.') + 1);
  }
  return attr;
}

/**
 * Опции «Значение» из ответа доменного API по выбранному параметру metadata (не «всегда имя»).
 */
export function buildDomainListValuesForAttribute(
  referenceEntity: string,
  records: unknown[],
  attribute: string,
  labelMaps?: ReportVehicleLabelMaps,
  field?: ReportFieldDefinition,
): Values {
  const ref = (referenceEntity === 'Driver' ? 'User' : referenceEntity).trim();
  const attr = resolveDomainScalarAttribute(referenceEntity, attribute);
  const visibleRecords = filterReportReferenceRecordsForUi(ref, records);
  if (!ref || !attr || !visibleRecords.length) return [];

  if (isReportCoordinatesCompositePropertyFieldName(attr)) {
    return buildCoordinatePairValueOptions(visibleRecords);
  }

  if (field && isDomainEntityReferencePicker(referenceEntity.trim(), field)) {
    return recordsToEntityListValues(referenceEntity.trim(), visibleRecords);
  }

  if (referenceEntity.trim() === 'VehicleBind' && isEntityIdAttribute(attr)) {
    return recordsToEntityListValues('VehicleBind', visibleRecords);
  }

  if (isEntityIdAttribute(attr)) {
    return recordsToIdOnlyListValues(visibleRecords);
  }

  if (isReportVehicleCarDisplayAttribute(attr)) {
    return buildReportVehicleCarValueOptions(visibleRecords);
  }

  if (ref === 'User' && attr === 'fullName') {
    return (visibleRecords as IUser[])
      .map((u) => {
        const label =
          (typeof u.fullName === 'string' && u.fullName.trim()) ||
          Formatters.nameFormatter(u, false) ||
          String(u.id);
        return { value: label, label };
      })
      .filter((item, index, arr) => arr.findIndex((x) => x.value === item.value) === index);
  }

  if (ref === 'DeviceAction') {
    if (isDeviceActionDeviceAttribute(attr)) {
      return buildDeviceActionDevicePickerOptions(visibleRecords);
    }
    if (isDeviceActionUserAttribute(attr)) {
      return buildDeviceActionUserPickerOptions(visibleRecords, attr);
    }
    return buildDeviceActionAttributeOptions(visibleRecords, attr);
  }

  return buildNestedEntityAttributeOptions(visibleRecords, referenceEntity.trim(), attr, labelMaps);
}
