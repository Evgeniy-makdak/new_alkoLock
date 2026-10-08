import type { Values } from '@shared/ui/search_multiple_select';

/**
 * Строка блока «Группировка».
 * having.* заполняется отдельно от selectedFields.aggregation
 * (aggregation в selectedFields — только контрол «Текущий состав таблицы»).
 */
export type ReportComposeGroupRow = {
  id: string;
  columnKey: string;
  /** having.operator */
  operator: string;
  /** having.aggregation (не selectedFields.aggregation) */
  havingAggregation: string;
  havingMode: string;
  topN: string;
  values: Values;
};

export function createReportComposeGroupRow(columnKey = ''): ReportComposeGroupRow {
  return {
    id: `report-group-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    columnKey,
    operator: '',
    havingAggregation: '',
    havingMode: '',
    topN: '',
    values: [],
  };
}
