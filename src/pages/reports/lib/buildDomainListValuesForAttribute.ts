import type { Values } from '@shared/ui/search_multiple_select';
import { Formatters } from '@shared/utils/formatters';

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
  const attr = (attribute ?? '').trim();
  if (!ref || !attr || !records.length) return [];

  if (field && isDomainEntityReferencePicker(ref, field)) {
    return recordsToEntityListValues(ref, records);
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

  return buildNestedEntityAttributeOptions(records, ref, attr, labelMaps);
}
