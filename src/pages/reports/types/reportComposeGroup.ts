import type { Values } from '@shared/ui/search_multiple_select';

/**
 * Строка блока «Группировка».
 * having.* — секция «Дополнительный фильтр к результату»;
 * selectedFields.aggregation — контрол «Текущий состав» и/или флаг
 * autoAggregateRemainingFields.
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
  /**
   * Если true — перед POST все столбцы «Текущего состава» (кроме groupBy)
   * получают эту агрегирующую функцию. По умолчанию false.
   */
  autoAggregateRemainingFields: boolean;
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
    autoAggregateRemainingFields: false,
  };
}
