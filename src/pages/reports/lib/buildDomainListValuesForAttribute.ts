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
  if (!ref || !attr || !records.length) return [];

  if (isReportCoordinatesCompositePropertyFieldName(attr)) {
    return buildCoordinatePairValueOptions(records);
  }

  if (field && isDomainEntityReferencePicker(referenceEntity.trim(), field)) {
    return recordsToEntityListValues(referenceEntity.trim(), records);
  }

  if (referenceEntity.trim() === 'VehicleBind' && isEntityIdAttribute(attr)) {
    return recordsToEntityListValues('VehicleBind', records);
  }

  if (isEntityIdAttribute(attr)) {
    return recordsToIdOnlyListValues(records);
  }

  if (isReportVehicleCarDisplayAttribute(attr)) {
    return buildReportVehicleCarValueOptions(records);
  }

  if (ref === 'User' && attr === 'fullName') {
    return (records as IUser[])
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
      return buildDeviceActionDevicePickerOptions(records);
    }
    if (isDeviceActionUserAttribute(attr)) {
      return buildDeviceActionUserPickerOptions(records);
    }
    return buildDeviceActionAttributeOptions(records, attr);
  }

  return buildNestedEntityAttributeOptions(records, referenceEntity.trim(), attr, labelMaps);
}
