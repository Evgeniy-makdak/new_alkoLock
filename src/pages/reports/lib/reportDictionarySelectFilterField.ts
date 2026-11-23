import { isReportDriverLicenceClassAttribute } from './fetchDriverLicenceClassOptions';
import {
  SERVICE_HISTORY_RESULT_REFERENCE_ENTITY,
  isEventsForFrontLevelAttribute,
} from './eventsForFrontReportOptions';
import { resolveReportVehicleDictionaryAttribute } from './reportVehicleDictionaryAttribute';

import type { ReportFieldDefinition } from '../types/reportApiTypes';

export type ReportDictionarySelectFilterContext = {
  field: ReportFieldDefinition | null | undefined;
  /** Сущность листа (Driver / Vehicle / EventsForFront / …). */
  leafEntityName?: string | null;
  /** Подсказки пути: fieldKey + nested path (vehicle.type.label и т.п.). */
  fieldPathHints?: string | null;
  /** Корневая сущность отчёта. */
  rootReportEntityName?: string | null;
  /** Маркер «Результат обработки заявки» (AutoServiceHistory). */
  isServiceHistoryResult?: boolean;
};

function fieldLeafName(fieldName: string): string {
  const name = fieldName.trim();
  return name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : name;
}

function contextBlob(ctx: ReportDictionarySelectFilterContext): string {
  return [
    ctx.leafEntityName,
    ctx.rootReportEntityName,
    ctx.fieldPathHints,
    ctx.field?.fieldName,
    ctx.field?.referenceEntity,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/**
 * Эвристика на случай metadata без onlyDefaultValue (старый бэк / кэш).
 * Операторы фронт не режет — их отдаёт availableOperations.
 */
export function isReportDictionarySelectFilterField(
  ctx: ReportDictionarySelectFilterContext,
): boolean {
  const field = ctx.field;
  if (!field) return false;

  const fieldName = (field.fieldName ?? '').trim();
  if (!fieldName) return false;
  const leaf = fieldLeafName(fieldName);
  const entity = (ctx.leafEntityName ?? field.referenceEntity ?? '').trim();
  const blob = contextBlob(ctx);

  // Результат обработки заявки
  if (
    ctx.isServiceHistoryResult ||
    entity === SERVICE_HISTORY_RESULT_REFERENCE_ENTITY
  ) {
    return true;
  }

  // Тип / Цвет ТС
  const vehicleAttr =
    resolveReportVehicleDictionaryAttribute(fieldName) ??
    (ctx.fieldPathHints
      ? resolveReportVehicleDictionaryAttribute(ctx.fieldPathHints)
      : null);
  if (
    vehicleAttr &&
    (entity === 'Vehicle' ||
      blob.includes('vehicle') ||
      fieldName.toLowerCase().includes('vehicle'))
  ) {
    return true;
  }

  // Режим работы алкозамка
  if (
    (leaf === 'mode' || fieldName === 'mode' || fieldName.endsWith('.mode')) &&
    (entity === 'MonitoringDevice' || blob.includes('monitoringdevice'))
  ) {
    return true;
  }

  // Уровень события
  if (
    isEventsForFrontLevelAttribute(fieldName) ||
    isEventsForFrontLevelAttribute(leaf) ||
    entity === 'LevelsForFront'
  ) {
    return true;
  }

  // Тип события (label/event у EventsForFront)
  if (
    (leaf === 'label' || leaf === 'event') &&
    (entity === 'EventsForFront' ||
      (field.referenceEntity ?? '').trim() === 'EventsForFront' ||
      blob.includes('eventsforfront'))
  ) {
    return true;
  }

  // Категории ВУ
  if (isReportDriverLicenceClassAttribute(fieldName)) {
    return true;
  }

  return false;
}

/**
 * Нужно ли запретить произвольный ввод значения фильтра.
 * Источник истины: field.onlyDefaultValue с бэка;
 * если флага нет — эвристика для известных справочников.
 */
export function shouldRestrictReportFilterValueToDefaults(
  ctx: ReportDictionarySelectFilterContext,
): boolean {
  const flag = ctx.field?.onlyDefaultValue;
  if (flag === true) return true;
  if (flag === false) return false;
  return isReportDictionarySelectFilterField(ctx);
}
