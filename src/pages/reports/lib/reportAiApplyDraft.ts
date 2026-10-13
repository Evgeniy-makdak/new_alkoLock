import { createDefaultReportOutputRow } from './reportOutputRow';
import { encodeReportTableFieldFunctionParam } from './reportTableFieldDisplayParam';
import { reportGenerationStore } from '../model/reportGenerationStore';
import { reportsStore } from '../model/reportsStore';
import { createDefaultChartSpec, normalizeChartSpec } from '../types/chartSpec';

import type { Values } from '@shared/ui/search_multiple_select';

import type { ReportAiComposeDraft } from '../types/reportAiComposeTypes';
import type { ReportQueryRequest } from '../types/reportApiTypes';

export function draftToReportQueryRequest(draft: ReportAiComposeDraft): ReportQueryRequest {
  return {
    selectedFields: draft.selectedFields ?? [],
    filters: draft.filters ?? [],
    ...(draft.groupBy?.length ? { groupBy: draft.groupBy } : {}),
    ...(draft.having?.length ? { having: draft.having } : {}),
    ...(draft.havingConnects?.length ? { havingConnects: draft.havingConnects } : {}),
    ...(draft.logicConnects?.length ? { logicConnects: draft.logicConnects } : {}),
  };
}

function selectedFieldsToTableValues(
  draft: ReportAiComposeDraft,
  labelByPath?: Record<string, string>,
): Values {
  return (draft.selectedFields ?? []).map((f) => ({
    value: f.fieldName,
    label: labelByPath?.[f.fieldName] ?? f.fieldName,
  }));
}

/**
 * Применяет AI-черновик к store: сущность, состав колонок, chart/view, queryContext, sort.
 * Фильтры уходят в body queryContext (редактор восстановит groupBy/having/aggregation).
 */
export async function applyReportAiComposeDraftToStore(
  draft: ReportAiComposeDraft,
  options?: { labelByPath?: Record<string, string> },
): Promise<{ entityName: string; body: ReportQueryRequest }> {
  const entityName = draft.entityName.trim();
  if (!entityName) throw new Error('Не указана сущность отчёта');

  const body = draftToReportQueryRequest(draft);
  const tableValues = selectedFieldsToTableValues(draft, options?.labelByPath);

  reportsStore.getState().setSelectedEntityName(entityName);
  await reportsStore.getState().loadMetadataForEntity(entityName);
  const meta = reportsStore.getState().metadata;
  if (meta) {
    await reportsStore.getState().loadAllReferenceEntityMetadataForReport(meta);
  }

  const row = createDefaultReportOutputRow();
  row.reportTableFields = tableValues;
  reportsStore.setState({
    outputRows: [row],
    logicOperator: draft.logicConnects?.[0]?.logicOperator === 'and' ? 'and' : 'or',
  });
  reportsStore.getState().setOutputRowReportTableFields(row.id, tableValues);

  const displayParams: Record<string, string> = {};
  for (const field of draft.selectedFields ?? []) {
    const encoded = encodeReportTableFieldFunctionParam(field.aggregation);
    if (encoded) displayParams[field.fieldName] = encoded;
  }
  reportsStore.getState().setTableFieldDisplayParamByPath(displayParams);

  const chartSpec =
    draft.viewMode === 'chart'
      ? normalizeChartSpec({
          ...createDefaultChartSpec(),
          ...(draft.chartSpec ?? {}),
        })
      : createDefaultChartSpec();

  reportsStore.getState().setViewMode(draft.viewMode);
  reportsStore.getState().setChartSpec(chartSpec);

  const sort = draft.sort ?? [];
  reportGenerationStore.getState().setSort(sort);
  reportGenerationStore.getState().setQueryContext({
    entityName,
    body,
    sort,
    chartSpec: draft.viewMode === 'chart' ? chartSpec : undefined,
  });

  return { entityName, body };
}
