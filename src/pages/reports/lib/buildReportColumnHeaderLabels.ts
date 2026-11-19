import i18n from 'i18next';

import {
  collectReportContentColumnKeys,
  orderReportContentColumnKeys,
  resolveReportColumnLabel,
} from './buildReportTableFieldOptions';
import { planReportCompositeResultColumns } from './reportEntityCompositeFields';
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
  if (!entityMetadata) {
    return {};
  }

  const t = i18n.t.bind(i18n);
  const columnAliases = buildReportColumnAliasMap(body?.selectedFields);
  const fieldMap = new Map(entityMetadata.fields.map((f) => [f.fieldName, f]));
  const activeOutputRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
  const contentKeys = content.length
    ? collectReportContentColumnKeys(content)
    : (body?.selectedFields ?? []).map((f) => f.fieldName).filter(Boolean);
  const orderedKeys = orderReportContentColumnKeys(contentKeys, body?.selectedFields);
  const { displayColumnKeys } = planReportCompositeResultColumns(
    orderedKeys,
    body?.selectedFields?.map((f) => f.fieldName),
  );
  const labels: Record<string, string> = {};

  for (const key of displayColumnKeys) {
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
    labels[key] = baseLabel;
  }

  return labels;
}
