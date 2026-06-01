import {
  collectReportContentColumnKeys,
  resolveReportColumnLabel,
} from './buildReportTableFieldOptions';
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

  const columnAliases = buildReportColumnAliasMap(body?.selectedFields);
  const fieldMap = new Map(entityMetadata.fields.map((f) => [f.fieldName, f]));
  const activeOutputRows = outputRows.filter((row) => row.selectedOutputFields.length > 0);
  const keys = collectReportContentColumnKeys(content);
  const labels: Record<string, string> = {};

  for (const key of keys) {
    labels[key] = resolveReportColumnHeaderLabel(
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
      ),
    );
  }

  return labels;
}
