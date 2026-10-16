import i18n from 'i18next';

import { encodeReportTableFieldFunctionParam } from './reportTableFieldDisplayParam';
import { decodeReportFieldAliasForUi } from './reportSelectedFieldAliases';
import { buildReportAiComposeLabelByPath } from './reportAiFieldLabels';
import { restoreReportComposeFiltersFromQuery } from './restoreReportComposeFiltersFromQuery';
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
  labelByPath: Record<string, string>,
): Values {
  return (draft.selectedFields ?? []).map((f) => {
    const path = (f.fieldName ?? '').trim();
    const fromAlias = (f.alias ?? '').trim()
      ? decodeReportFieldAliasForUi(String(f.alias))
      : '';
    const fromMeta = (labelByPath[path] ?? '').trim();
    return {
      value: path,
      // UI-подпись из metadata.label (как вручную), не fieldName.
      label: fromAlias || fromMeta || path,
    };
  });
}

/**
 * Применяет AI-черновик к store: сущность, состав колонок, фильтры UI, chart/view,
 * queryContext, sort. Подписи колонок/фильтров — из metadata.label (не fieldName).
 */
export async function applyReportAiComposeDraftToStore(
  draft: ReportAiComposeDraft,
  options?: { labelByPath?: Record<string, string> },
): Promise<{ entityName: string; body: ReportQueryRequest }> {
  const entityName = draft.entityName.trim();
  if (!entityName) throw new Error('Не указана сущность отчёта');

  const body = draftToReportQueryRequest(draft);

  reportsStore.getState().setSelectedEntityName(entityName);
  await reportsStore.getState().loadMetadataForEntity(entityName);
  const meta = reportsStore.getState().metadata;
  if (meta) {
    await reportsStore.getState().loadAllReferenceEntityMetadataForReport(meta);
  }

  const store = reportsStore.getState();
  const labelByPath = {
    ...buildReportAiComposeLabelByPath({
      metadata: meta,
      outputRows: store.outputRows,
      reportTableFieldsMetadataByRowId: store.reportTableFieldsMetadataByRowId,
      referenceEntityMetadataByName: store.referenceEntityMetadataByName,
      entities: store.entities,
      t: i18n.t.bind(i18n),
    }),
    ...(options?.labelByPath ?? {}),
  };
  const tableValues = selectedFieldsToTableValues(draft, labelByPath);
  const columnHeaderLabels = Object.fromEntries(
    tableValues
      .map((item) => [String(item.value ?? '').trim(), String(item.label ?? '').trim()] as const)
      .filter(([key, label]) => key && label),
  );

  // Сначала узнаём primary-поля фильтров, чтобы дождаться nested metadata
  // и сразу подставить русские label операторов/атрибутов.
  const previewRows = restoreReportComposeFiltersFromQuery(draft.filters, meta, tableValues);
  const tableMetaLoads: Promise<unknown>[] = [];
  for (const row of previewRows) {
    const key = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    const field = meta?.fields.find((f) => f.fieldName === key);
    const ref = field?.referenceEntity?.trim();
    if (ref) {
      tableMetaLoads.push(reportsStore.getState().loadReportTableFieldsMetadata(row.id, ref));
    }
  }
  if (tableMetaLoads.length) {
    await Promise.all(tableMetaLoads);
  }

  const nestedByName = reportsStore.getState().referenceEntityMetadataByName;
  const outputRows = restoreReportComposeFiltersFromQuery(draft.filters, meta, tableValues, {
    referenceEntityMetadataByName: nestedByName,
  });
  reportsStore.setState({
    outputRows,
    logicOperator: draft.logicConnects?.[0]?.logicOperator === 'and' ? 'and' : 'or',
  });
  // Держим reportTableFields на primary в sync со store-хелпером.
  if (outputRows[0]) {
    reportsStore.getState().setOutputRowReportTableFields(outputRows[0].id, tableValues);
  }

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
    // Чтобы edit-restore не падал обратно на fieldName.
    columnHeaderLabels,
    chartSpec: draft.viewMode === 'chart' ? chartSpec : undefined,
  });

  return { entityName, body };
}
