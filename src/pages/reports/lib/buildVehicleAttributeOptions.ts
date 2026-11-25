import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';
import { resolveVehicleAttributeLabel } from './fetchVehicleFrontDataMaps';
import { resolveReportVehicleDictionaryAttribute } from './reportVehicleDictionaryAttribute';

import type { ICar } from '@shared/types/BaseQueryTypes';
import type { Values } from '@shared/ui/search_multiple_select';

import { Formatters } from '@shared/utils/formatters';

function readCarAttribute(car: ICar, attribute: string): string | number | null | undefined {
  if (attribute === 'id') {
    return car.id;
  }
  const value = (car as unknown as Record<string, unknown>)[attribute];
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return String(value);
}

function resolveOptionLabel(
  attribute: string,
  value: string,
  car: ICar | undefined,
  labelMaps?: ReportVehicleLabelMaps,
): string {
  if (attribute === 'type') {
    return resolveVehicleAttributeLabel('type', value, labelMaps) ?? value;
  }
  if (attribute === 'color') {
    return resolveVehicleAttributeLabel('color', value, labelMaps) ?? value;
  }
  if (attribute === 'id' && car) {
    return Formatters.carNameFormatter(car, false, true, false) ?? value;
  }
  return value;
}

/**
 * front-data map: key(PASSENGER) → value(«Автобус»).
 * В filter.values уходит русская подпись (value), не код key —
 * бэк ждёт «Автобус», а не «PASSENGER» / «PERSONAL».
 */
function dictionaryToValues(map: Record<string, string>): Values {
  const seen = new Set<string>();
  const values: Values = [];
  for (const label of Object.values(map)) {
    const text = String(label ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    values.push({ value: text, label: text });
  }
  return values.sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'));
}

/** Опции значения параметра ТС для фильтра отчёта. */
export function buildVehicleAttributeOptions(
  cars: ICar[],
  attribute: string,
  labelMaps?: ReportVehicleLabelMaps,
): Values {
  const attr = resolveReportVehicleDictionaryAttribute(attribute) ?? attribute;
  if (attr === 'color' && labelMaps?.colors && Object.keys(labelMaps.colors).length > 0) {
    return dictionaryToValues(labelMaps.colors);
  }
  if (attr === 'type' && labelMaps?.types && Object.keys(labelMaps.types).length > 0) {
    return dictionaryToValues(labelMaps.types);
  }

  const seen = new Map<string, Values[number]>();

  for (const car of cars) {
    const raw = readCarAttribute(car, attribute);
    if (raw == null) continue;

    const code = String(raw);
    const label = resolveOptionLabel(attribute, code, car, labelMaps);
    // type/color: в values фильтра — русская подпись; прочие атрибуты — как раньше (код/id).
    const optionValue =
      attr === 'type' || attr === 'color' ? label : code;
    if (seen.has(String(optionValue))) continue;

    seen.set(String(optionValue), {
      value: optionValue,
      label,
    });
  }

  return Array.from(seen.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label), 'ru', { numeric: true }),
  );
}

/** Подписи для уже выбранных значений (чипы) при смене справочника. */
export function enrichVehicleFilterValues(
  attribute: string,
  values: Values,
  labelMaps?: ReportVehicleLabelMaps,
): Values {
  if (!attribute || !values.length) return values;

  return values.map((item) => {
    const raw = String(item.value);
    const attr = resolveReportVehicleDictionaryAttribute(attribute) ?? attribute;
    const label = resolveOptionLabel(attr, raw, undefined, labelMaps);
    // Старый чип мог хранить код (PERSONAL) — в filter.values нужна русская подпись.
    if (attr === 'type' || attr === 'color') {
      return { value: label, label };
    }
    return { value: raw, label };
  });
}
