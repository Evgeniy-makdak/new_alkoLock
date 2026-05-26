import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
} from '../types/reportApiTypes';

/** Черта между сущностью и полем (как Table.Column в Power BI / SQL). */
export const QUALIFIED_LABEL_SEPARATOR = ' · ';

export type ReportTableFieldOptionDraft = {
  value: string;
  baseLabel: string;
  sourceLabel: string;
};

function normalizeReportFieldLabelKey(label: string): string {
  return label.trim().toLocaleLowerCase();
}

/** «Сущность · поле» — только если одно и то же имя поля встречается у разных источников. */
export function formatQualifiedReportTableFieldLabel(
  sourceLabel: string,
  fieldLabel: string,
): string {
  const source = sourceLabel.trim();
  const field = fieldLabel.trim();
  if (!source) return field;
  if (!field) return source;
  return `${source}${QUALIFIED_LABEL_SEPARATOR}${field}`;
}

export function disambiguateReportTableFieldOptionLabels(
  drafts: ReportTableFieldOptionDraft[],
): Values {
  const duplicateBaseKeys = new Set<string>();
  const counts = new Map<string, number>();
  for (const draft of drafts) {
    const key = normalizeReportFieldLabelKey(draft.baseLabel);
    const next = (counts.get(key) ?? 0) + 1;
    counts.set(key, next);
    if (next > 1) {
      duplicateBaseKeys.add(key);
    }
  }

  return drafts.map(({ value, baseLabel, sourceLabel }) => {
    const needsQualifier = duplicateBaseKeys.has(normalizeReportFieldLabelKey(baseLabel));
    const label = needsQualifier
      ? formatQualifiedReportTableFieldLabel(sourceLabel, baseLabel)
      : baseLabel;
    return { value, label };
  });
}

/** DeviceEvent → deviceEvent (префикс полей корневой сущности в selectedFields). */
export function reportEntityFieldPrefix(entityName: string): string {
  const trimmed = entityName.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function prefixedFieldName(prefix: string, fieldName: string): string {
  if (!prefix) return fieldName;
  if (fieldName === prefix || fieldName.startsWith(`${prefix}.`)) {
    return fieldName;
  }
  return `${prefix}.${fieldName}`;
}

/**
 * Имя поля в filters[] (POST …/DeviceEvent/query).
 * Как в примере бэка: eventsForFront.event, user.surname — путь к связанной сущности;
 * поля корня отчёта (timestamp, reportedAt) — без префикса deviceEvent.
 * Префикс deviceEvent.* только в selectedFields / колонках таблицы.
 */
export function resolveReportFilterFieldName(entityName: string, fieldName: string): string {
  const rootPrefix = reportEntityFieldPrefix(entityName);
  if (rootPrefix && (fieldName === rootPrefix || fieldName.startsWith(`${rootPrefix}.`))) {
    return fieldName === rootPrefix ? fieldName : fieldName.slice(rootPrefix.length + 1);
  }
  return fieldName;
}

/** Поле можно выбрать в «Поля в отчёте» (контракт metadata.selectable). */
export function isReportTableSelectableField(field: ReportFieldDefinition): boolean {
  return field.selectable === true;
}

export function tableFieldsForReportTableSelection(
  fields: ReportFieldDefinition[],
): ReportFieldDefinition[] {
  return fields.filter(isReportTableSelectableField);
}

/** Имена «Поле результата» во всех строках фильтра (device, vehicle, …). */
export function collectOutputResultFieldNames(outputRows: ReportOutputRow[]): Set<string> {
  const names = new Set<string>();
  for (const row of outputRows) {
    const key = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    if (key) names.add(key);
  }
  return names;
}

/**
 * Все опции «Поля в отчёте»:
 * — selectable поля сущности отчёта (deviceEvent.*), кроме полей-ссылок из строк фильтра;
 * — selectable поля metadata каждой строки (device.*, vehicle.*, …).
 */
export function mergeAllReportTableFieldOptions(
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
): Values {
  if (!entityMetadata) return [];

  const rootPrefix = reportEntityFieldPrefix(entityMetadata.entityName);
  const outputFieldNames = collectOutputResultFieldNames(outputRows);
  const entitySourceLabel = entityMetadata.label?.trim() || entityMetadata.entityName;
  const seen = new Set<string>();
  const drafts: ReportTableFieldOptionDraft[] = [];

  for (const f of entityMetadata.fields) {
    if (outputFieldNames.has(f.fieldName)) continue;
    if (!isReportTableSelectableField(f)) continue;
    const value = prefixedFieldName(rootPrefix, f.fieldName);
    if (seen.has(value)) continue;
    seen.add(value);
    drafts.push({
      value,
      baseLabel: f.label || f.fieldName,
      sourceLabel: entitySourceLabel,
    });
  }

  for (const row of outputRows) {
    const outputKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    if (!outputKey) continue;

    const outputField = fieldMap.get(outputKey);
    const refEntity = outputField?.referenceEntity?.trim();
    if (!refEntity || !outputField) continue;

    const nestedPrefix = outputField.fieldName;
    const nestedSourceLabel = outputField.label?.trim() || outputField.fieldName;
    const tableMeta = tableMetadataByRowId[row.id];
    for (const f of tableFieldsForReportTableSelection(tableMeta?.fields ?? [])) {
      const value = prefixedFieldName(nestedPrefix, f.fieldName);
      if (seen.has(value)) continue;
      seen.add(value);
      drafts.push({
        value,
        baseLabel: f.label || f.fieldName,
        sourceLabel: nestedSourceLabel,
      });
    }
  }

  return disambiguateReportTableFieldOptionLabels(drafts);
}


export function hasReportTableFieldsMetadataDefaults(
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
): boolean {
  return mergeAllReportTableFieldOptions(entityMetadata, outputRows, fieldMap, tableMetadataByRowId).length > 0;
}

export function findReportTableFieldDefinition(
  fieldPath: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition | undefined {
  const rootPrefix = reportEntityFieldPrefix(entityMetadata?.entityName ?? '');
  const allEntityFields = entityMetadata?.fields ?? [];

  if (rootPrefix && fieldPath.startsWith(`${rootPrefix}.`)) {
    const leaf = fieldPath.slice(rootPrefix.length + 1);
    return allEntityFields.find((f) => f.fieldName === leaf);
  }

  for (const row of outputRows) {
    const outputKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    if (!outputKey) continue;
    const outputField = fieldMap.get(outputKey);
    const nestedPrefix = outputField?.fieldName?.trim() ?? '';
    if (!nestedPrefix || !fieldPath.startsWith(`${nestedPrefix}.`)) continue;

    const leaf = fieldPath.slice(nestedPrefix.length + 1);
    const tableFields = tableMetadataByRowId[row.id]?.fields ?? [];
    const exact = tableFields.find((f) => f.fieldName === leaf);
    if (exact) return exact;
    const leafName = leaf.includes('.') ? leaf.slice(leaf.lastIndexOf('.') + 1) : leaf;
    return tableFields.find((f) => f.fieldName === leafName);
  }

  return allEntityFields.find((f) => f.fieldName === fieldPath);
}

/** Имя в POST selectedFields — путь уже полный из модалки. */
export function resolveReportTableSelectedPayloadFieldName(
  fieldNameOrPath: string,
): string {
  return fieldNameOrPath;
}

export function findReportFieldDefForColumnKey(
  columnKey: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition | undefined {
  return findReportTableFieldDefinition(
    columnKey,
    entityMetadata,
    outputRows,
    fieldMap,
    tableMetadataByRowId,
  );
}

export function resolveReportColumnLabel(
  columnKey: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
): string {
  if (!entityMetadata) {
    return columnKey;
  }
  const fieldMapLocal = fieldMap.size
    ? fieldMap
    : new Map(entityMetadata.fields.map((f) => [f.fieldName, f]));
  const options = mergeAllReportTableFieldOptions(
    entityMetadata,
    outputRows,
    fieldMapLocal,
    tableMetadataByRowId,
  );
  const match = options.find((o) => String(o.value) === columnKey);
  if (match?.label) {
    return match.label;
  }
  return (
    findReportFieldDefForColumnKey(
      columnKey,
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
    )?.label || columnKey
  );
}

export function collectReportContentColumnKeys(content: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();
  for (const row of content) {
    for (const key of Object.keys(row)) {
      if (key !== 'id') {
        keys.add(key);
      }
    }
  }
  return Array.from(keys);
}
