import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportLogicOperator,
  ReportNestedEntityFilterByField,
  ReportOutputRow,
} from '../types/reportApiTypes';

function serializeValues(values: Values | undefined): string[] {
  return (values ?? []).map((item) => String(item.value));
}

/** Путь nested-фильтра без values — смена выбранных офисов/устройств не должна сбрасывать группировку. */
function serializeNestedEntityFilterStructure(
  nested: ReportNestedEntityFilterByField,
): Record<string, { path: string[] }> {
  const result: Record<string, { path: string[] }> = {};
  for (const [key, state] of Object.entries(nested)) {
    if (!state) continue;
    result[key] = {
      path: [...(state.path ?? [])],
    };
  }
  return result;
}

/**
 * Ключ «структуры» фильтров (сущность, поле результата, путь nested).
 * Значения мультиселектов и filterSelections сюда не входят — иначе правка
 * «Значение (Название)» в edit очищала бы группировку/сортировку.
 */
export function buildComposeFilterConfigurationKey(params: {
  selectedEntityName: string | null;
  logicOperator: ReportLogicOperator;
  outputRows: ReportOutputRow[];
}): string {
  const { selectedEntityName, logicOperator, outputRows } = params;

  const rows = outputRows.map((row) => ({
    id: row.id,
    selectedOutputFields: serializeValues(row.selectedOutputFields),
    nestedEntityFilterByField: serializeNestedEntityFilterStructure(
      row.nestedEntityFilterByField,
    ),
  }));

  return JSON.stringify({ selectedEntityName, logicOperator, rows });
}
