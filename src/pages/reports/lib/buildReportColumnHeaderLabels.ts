import i18n from 'i18next';

import {
  collectReportContentColumnKeys,
  orderReportContentColumnKeys,
  resolveReportColumnLabel,
} from './buildReportTableFieldOptions';
import { planReportCompositeResultColumns } from './reportEntityCompositeFields';
import {
  applyReportAggregationHeaderLabel,
  buildReportFieldAggregationMap,
  buildReportGroupBySet,
  resolveReportColumnDisplayAggregation,
} from './reportAggregationDisplay';
import { buildReportColumnAliasMap, resolveReportColumnHeaderLabel } from './reportSelectedFieldAliases';
import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportOutputRow,
  ReportQueryRequest,
} from '../types/reportApiTypes';

/** Заголовки колонок на момент успешного query — не зависят от черновика в модалке. */
export function buildReportColumnHeaderLabels(
  content: Record<string, unknown>[],
  entityMetadata: ReportEntityMetadata | null | undefined,
  body: ReportQueryRequest | undefined,
  outputRows: ReportOutputRow[],
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
  entities: ReportEntityListItem[],
): Record<string, string> {
  if (!content.length || !entityMetadata) {
    return {};
  }

  const t = i18n.t.bind(i18n);
  const columnAliases = buildReportColumnAliasMap(body?.selectedFields);
  const fieldMap = new Map(entityMetadata.fields.map((f) => [f.fieldName, f]));
  const activeOutputRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
  const contentKeys = collectReportContentColumnKeys(content);
  const orderedKeys = orderReportContentColumnKeys(
    contentKeys,
    body?.selectedFields?.map((f) => f.fieldName),
  );
  const { displayColumnKeys, groups } = planReportCompositeResultColumns(
    orderedKeys,
    body?.selectedFields?.map((f) => f.fieldName),
  );
  const compositeByKey = new Map(groups.map((group) => [group.compositeKey, group]));
  const aggregationMap = buildReportFieldAggregationMap(body?.selectedFields);
  const groupBySet = buildReportGroupBySet(body?.groupBy);
  const labels: Record<string, string> = {};

  for (const key of displayColumnKeys) {
    const compositeGroup = compositeByKey.get(key);
    const columnAggregation = resolveReportColumnDisplayAggregation(
      key,
      compositeGroup,
      aggregationMap,
      groupBySet,
    );
    const baseLabel = resolveReportColumnHeaderLabel(
      key,
      columnAliases,
      resolveReportColumnLabel(
        key,
        entityMetadata,
        activeOutputRows,
        fieldMap,
        tableMetadataByRowId,
        referenceEntityMetadataByName,
        entities,
        t,
      ),
    );
    labels[key] = applyReportAggregationHeaderLabel(baseLabel, columnAggregation, t);
  }

  return labels;
}
