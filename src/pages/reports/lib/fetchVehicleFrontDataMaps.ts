import { CarsApi } from '@shared/api/baseQuerys';

export type ReportVehicleLabelMaps = {
  types: Record<string, string>;
  colors: Record<string, string>;
};

const emptyMaps = (): ReportVehicleLabelMaps => ({ types: {}, colors: {} });

function toKeyValueMap(items: { key: string; value: string }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of items ?? []) {
    if (item?.key) {
      map[item.key] = item.value;
      // Дублируем UPPER — бэк отдаёт GREY/PASSENGER, справочник может быть в другом регистре.
      map[String(item.key).toUpperCase()] = item.value;
    }
  }
  return map;
}

/** Код ТС (GREY / grey) → русская подпись из front-data. */
export function resolveVehicleAttributeLabel(
  attribute: 'type' | 'color',
  code: string,
  labelMaps?: ReportVehicleLabelMaps | null,
): string | undefined {
  if (!labelMaps || !code) return undefined;
  const map = attribute === 'type' ? labelMaps.types : labelMaps.colors;
  return map[code] ?? map[code.toUpperCase()] ?? map[code.toLowerCase()];
}

/** Справочники типов и цветов ТС для отображения в отчёте. */
export async function fetchVehicleFrontDataMaps(): Promise<ReportVehicleLabelMaps> {
  try {
    const [colorsRes, typesRes] = await Promise.all([
      CarsApi.getVehicleColors(),
      CarsApi.getVehicleTypes(),
    ]);

    if (colorsRes.isError || typesRes.isError) {
      return emptyMaps();
    }

    return {
      colors: toKeyValueMap(colorsRes.data),
      types: toKeyValueMap(typesRes.data),
    };
  } catch {
    return emptyMaps();
  }
}
