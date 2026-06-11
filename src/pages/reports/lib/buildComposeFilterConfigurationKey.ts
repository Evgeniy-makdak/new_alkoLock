import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportLogicOperator,
  ReportNestedEntityFilterByField,
  ReportOutputRow,
  ReportUiFilterSelections,
} from '../types/reportApiTypes';

function serializeValues(values: Values | undefined): string[] {
  return (values ?? []).map((item) => String(item.value));
}

function serializeFilterSelections(
  selections: ReportUiFilterSelections,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, values] of Object.entries(selections)) {
    result[key] = serializeValues(values);
  }
  return result;
}

function serializeNestedEntityFilters(
  nested: ReportNestedEntityFilterByField,
): Record<string, { path: string[]; values: string[] }> {
  const result: Record<string, { path: string[]; values: string[] }> = {};
  for (const [key, state] of Object.entries(nested)) {
    if (!state) continue;
    result[key] = {
      path: [...(state.path ?? [])],
      values: serializeValues(state.values),
    };
  }
  return result;
}

/** Стабильный ключ конфигурации фильтров — при смене сбрасываем сортировку и группировку. */
export function buildComposeFilterConfigurationKey(params: {
  selectedEntityName: string | null;
  logicOperator: ReportLogicOperator;
  outputRows: ReportOutputRow[];
}): string {
  const { selectedEntityName, logicOperator, outputRows } = params;

  const rows = outputRows.map((row) => ({
    id: row.id,
    selectedOutputFields: serializeValues(row.selectedOutputFields),
    filterSelections: serializeFilterSelections(row.filterSelections),
    nestedEntityFilterByField: serializeNestedEntityFilters(row.nestedEntityFilterByField),
  }));

  return JSON.stringify({ selectedEntityName, logicOperator, rows });
}
