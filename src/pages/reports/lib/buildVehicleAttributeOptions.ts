import type { ReportVehicleLabelMaps } from './fetchVehicleFrontDataMaps';

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
    return labelMaps?.types[value] ?? value;
  }
  if (attribute === 'color') {
    return labelMaps?.colors[value] ?? value;
  }
  if (attribute === 'id' && car) {
    return Formatters.carNameFormatter(car, false, true, false);
  }
  return value;
}

function dictionaryToValues(map: Record<string, string>): Values {
  return Object.entries(map)
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => String(a.label).localeCompare(String(b.label), 'ru'));
}

/** Опции значения параметра ТС для фильтра отчёта. */
export function buildVehicleAttributeOptions(
  cars: ICar[],
  attribute: string,
  labelMaps?: ReportVehicleLabelMaps,
): Values {
  if (attribute === 'color' && labelMaps?.colors && Object.keys(labelMaps.colors).length > 0) {
    return dictionaryToValues(labelMaps.colors);
  }
  if (attribute === 'type' && labelMaps?.types && Object.keys(labelMaps.types).length > 0) {
    return dictionaryToValues(labelMaps.types);
  }

  const seen = new Map<string, Values[number]>();

  for (const car of cars) {
    const raw = readCarAttribute(car, attribute);
    if (raw == null) continue;

    const value = String(raw);
    if (seen.has(value)) continue;

    seen.set(value, {
      value,
      label: resolveOptionLabel(attribute, value, car, labelMaps),
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
    const value = String(item.value);
    const label = resolveOptionLabel(attribute, value, undefined, labelMaps);
    return { value, label };
  });
}
