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
    }
  }
  return map;
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
