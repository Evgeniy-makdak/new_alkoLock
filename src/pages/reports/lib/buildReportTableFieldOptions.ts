import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
} from '../types/reportApiTypes';

/** @deprecated Используйте ROOT_ENTITY_LABEL_SEPARATOR; оставлено для распознавания старых подписей. */
export const QUALIFIED_LABEL_SEPARATOR = ' · ';

/** Между сущностью и полем (например «Отчёт по событиям -> Идентификатор», «ТС -> Марка»). */
export const ROOT_ENTITY_LABEL_SEPARATOR = ' -> ';

export type ReportTableFieldOptionDraft = {
  value: string;
  baseLabel: string;
  sourceLabel: string;
  qualifyAs: 'root' | 'nested';
};

/** «Сущность -> поле» (корень и вложенные связи). */
export function formatQualifiedReportTableFieldLabel(
  sourceLabel: string,
  fieldLabel: string,
): string {
  return formatRootReportTableFieldLabel(sourceLabel, fieldLabel);
}

/** «Сущность -> поле». */
export function formatRootReportTableFieldLabel(
  entityLabel: string,
  fieldLabel: string,
): string {
  const entity = entityLabel.trim();
  const field = fieldLabel.trim();
  if (!entity) return field;
  if (!field) return entity;
  return `${entity}${ROOT_ENTITY_LABEL_SEPARATOR}${field}`;
}

export function buildReportTableFieldOptionLabel(draft: ReportTableFieldOptionDraft): string {
  return formatRootReportTableFieldLabel(draft.sourceLabel, draft.baseLabel);
}

/** Подпись сущности отчёта: из GET …/entities, затем metadata, иначе entityName. */
export function resolveReportEntitySourceLabel(
  entityMetadata: ReportEntityMetadata | null | undefined,
  entities: ReportEntityListItem[] = [],
): string {
  if (!entityMetadata) return '';
  const fromList = entities.find((e) => e.entityName === entityMetadata.entityName)?.label?.trim();
  return fromList || entityMetadata.label?.trim() || entityMetadata.entityName;
}

export function applyReportEntityListLabel(
  metadata: ReportEntityMetadata,
  entities: ReportEntityListItem[],
): ReportEntityMetadata {
  const label = resolveReportEntitySourceLabel(metadata, entities);
  if (label === metadata.label) return metadata;
  return { ...metadata, label };
}

export function buildReportTableFieldOptionLabels(drafts: ReportTableFieldOptionDraft[]): Values {
  return drafts.map((draft) => ({
    value: draft.value,
    label: buildReportTableFieldOptionLabel(draft),
  }));
}

/** @deprecated Используйте buildReportTableFieldOptionLabels — подписи всегда с префиксом сущности. */
export function disambiguateReportTableFieldOptionLabels(
  drafts: ReportTableFieldOptionDraft[],
): Values {
  return buildReportTableFieldOptionLabels(drafts);
}

/** Уникальные referenceEntity из metadata сущности отчёта. */
export function collectReferenceEntitiesFromMetadata(
  entityMetadata: ReportEntityMetadata | null | undefined,
): string[] {
  if (!entityMetadata?.fields?.length) return [];
  const names = new Set<string>();
  for (const field of entityMetadata.fields) {
    const ref = field.referenceEntity?.trim();
    if (ref) names.add(ref);
  }
  return Array.from(names);
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
 * Имя поля в POST …/query (selectedFields, filters).
 * Корень отчёта (DeviceEvent): timestamp, id — без префикса deviceEvent.
 * Связи: eventsForFront.event, device.serialNumber и т.д.
 * Устаревшие значения UI deviceEvent.* приводятся к имени из metadata.
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

/**
 * Поля вложенной сущности для «Доступные колонки».
 * Сначала selectable=true; иначе — скалярные filterable (у BranchAssignment и др. часто selectable=false).
 */
/** Поля для «Параметр сущности» — шире, чем только filterable (как для колонок вложенной сущности). */
export function referenceEntityFilterPropertyFields(
  fields: ReportFieldDefinition[],
): ReportFieldDefinition[] {
  const fromNested = tableFieldsForNestedReportTableSelection(fields);
  if (fromNested.length > 0) return fromNested;

  const withOps = fields.filter(
    (f) => f.filterable || (f.availableOperations?.length ?? 0) > 0,
  );
  if (withOps.length > 0) return withOps;

  return fields.filter((f) => {
    const type = (f.type ?? '').toUpperCase();
    return type !== 'ENTITY' || f.filterable;
  });
}

export function tableFieldsForNestedReportTableSelection(
  fields: ReportFieldDefinition[],
): ReportFieldDefinition[] {
  const selectable = fields.filter(isReportTableSelectableField);
  if (selectable.length > 0) {
    return selectable;
  }

  const filterableScalars = fields.filter((f) => {
    const type = (f.type ?? '').toUpperCase();
    if (type === 'ENTITY') {
      return isReportTableSelectableField(f);
    }
    return f.filterable && f.selectable !== false;
  });
  if (filterableScalars.length > 0) {
    return filterableScalars;
  }

  const nonEntity = fields.filter((f) => (f.type ?? '').toUpperCase() !== 'ENTITY');
  if (nonEntity.length > 0) {
    return nonEntity;
  }

  return fields;
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

function nestedMetadataFields(
  referenceEntity: string,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): ReportFieldDefinition[] {
  return referenceEntityMetadataByName[referenceEntity]?.fields ?? [];
}

/** Только selectable поля выбранной сущности отчёта (без вложенных связей). */
export function buildRootReportTableFieldOptions(
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[] = [],
  entities: ReportEntityListItem[] = [],
): Values {
  if (!entityMetadata) return [];

  const outputFieldNames = collectOutputResultFieldNames(outputRows);
  const entitySourceLabel = resolveReportEntitySourceLabel(entityMetadata, entities);
  const drafts: ReportTableFieldOptionDraft[] = [];

  for (const f of entityMetadata.fields) {
    if (outputFieldNames.has(f.fieldName)) continue;
    if (!isReportTableSelectableField(f)) continue;
    drafts.push({
      value: f.fieldName,
      baseLabel: f.label || f.fieldName,
      sourceLabel: entitySourceLabel,
      qualifyAs: 'root',
    });
  }

  return buildReportTableFieldOptionLabels(drafts);
}

/**
 * Все опции «Поля в отчёте»:
 * — selectable поля сущности отчёта (timestamp, id, …), кроме полей-ссылок из строк фильтра;
 * — selectable поля metadata всех вложенных сущностей (referenceEntity) из metadata отчёта.
 */
export function mergeAllReportTableFieldOptions(
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
  entities: ReportEntityListItem[] = [],
): Values {
  if (!entityMetadata) return [];

  const outputFieldNames = collectOutputResultFieldNames(outputRows);
  const entitySourceLabel = resolveReportEntitySourceLabel(entityMetadata, entities);
  const seen = new Set<string>();
  const drafts: ReportTableFieldOptionDraft[] = [];

  for (const f of entityMetadata.fields) {
    if (outputFieldNames.has(f.fieldName)) continue;
    if (!isReportTableSelectableField(f)) continue;
    const value = f.fieldName;
    if (seen.has(value)) continue;
    seen.add(value);
    drafts.push({
      value,
      baseLabel: f.label || f.fieldName,
      sourceLabel: entitySourceLabel,
      qualifyAs: 'root',
    });
  }

  for (const parentField of entityMetadata.fields) {
    const refEntity = parentField.referenceEntity?.trim();
    if (!refEntity) continue;

    const nestedPrefix = parentField.fieldName;
    const nestedSourceLabel = parentField.label?.trim() || parentField.fieldName;
    const tableFields = nestedMetadataFields(refEntity, referenceEntityMetadataByName);
    const fieldsToUse =
      tableFields.length > 0
        ? tableFields
        : (() => {
            for (const row of outputRows) {
              const outputKey = row.selectedOutputFields[0]
                ? String(row.selectedOutputFields[0].value)
                : '';
              if (outputKey !== parentField.fieldName) continue;
              return tableMetadataByRowId[row.id]?.fields ?? [];
            }
            return [];
          })();

    for (const f of tableFieldsForNestedReportTableSelection(fieldsToUse)) {
      const value = prefixedFieldName(nestedPrefix, f.fieldName);
      if (seen.has(value)) continue;
      seen.add(value);
      drafts.push({
        value,
        baseLabel: f.label || f.fieldName,
        sourceLabel: nestedSourceLabel,
        qualifyAs: 'nested',
      });
    }
  }

  return buildReportTableFieldOptionLabels(drafts);
}

export function hasReportTableFieldsMetadataDefaults(
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
): boolean {
  return (
    mergeAllReportTableFieldOptions(
      entityMetadata,
      outputRows,
      fieldMap,
      tableMetadataByRowId,
      referenceEntityMetadataByName,
    ).length > 0
  );
}

export function findReportTableFieldDefinition(
  fieldPath: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
): ReportFieldDefinition | undefined {
  const rootPrefix = reportEntityFieldPrefix(entityMetadata?.entityName ?? '');
  const allEntityFields = entityMetadata?.fields ?? [];

  if (rootPrefix && fieldPath.startsWith(`${rootPrefix}.`)) {
    const leaf = fieldPath.slice(rootPrefix.length + 1);
    return allEntityFields.find((f) => f.fieldName === leaf);
  }

  for (const parentField of allEntityFields) {
    const nestedPrefix = parentField.fieldName?.trim() ?? '';
    if (!nestedPrefix || !fieldPath.startsWith(`${nestedPrefix}.`)) continue;

    const leaf = fieldPath.slice(nestedPrefix.length + 1);
    const refEntity = parentField.referenceEntity?.trim();
    const tableFields = refEntity
      ? nestedMetadataFields(refEntity, referenceEntityMetadataByName)
      : [];

    const exact = tableFields.find((f) => f.fieldName === leaf);
    if (exact) return exact;
    const leafName = leaf.includes('.') ? leaf.slice(leaf.lastIndexOf('.') + 1) : leaf;
    const byLeaf = tableFields.find((f) => f.fieldName === leafName);
    if (byLeaf) return byLeaf;
  }

  for (const row of outputRows) {
    const outputKey = row.selectedOutputFields[0] ? String(row.selectedOutputFields[0].value) : '';
    if (!outputKey) continue;
    const outputField = fieldMap.get(outputKey);
    const nestedPrefix = outputField?.fieldName?.trim() ?? '';
    if (!nestedPrefix || !fieldPath.startsWith(`${nestedPrefix}.`)) continue;

    const leaf = fieldPath.slice(nestedPrefix.length + 1);
    const refEntity = outputField?.referenceEntity?.trim();
    const tableFields = refEntity
      ? nestedMetadataFields(refEntity, referenceEntityMetadataByName)
      : (tableMetadataByRowId[row.id]?.fields ?? []);
    const exact = tableFields.find((f) => f.fieldName === leaf);
    if (exact) return exact;
    const leafName = leaf.includes('.') ? leaf.slice(leaf.lastIndexOf('.') + 1) : leaf;
    return tableFields.find((f) => f.fieldName === leafName);
  }

  return allEntityFields.find((f) => f.fieldName === fieldPath);
}

/** Имя в POST selectedFields — как в metadata / filters (без префикса корневой сущности). */
export function resolveReportTableSelectedPayloadFieldName(
  fieldNameOrPath: string,
  entityName?: string,
): string {
  if (!entityName?.trim()) {
    return fieldNameOrPath;
  }
  return resolveReportFilterFieldName(entityName, fieldNameOrPath);
}

export function findReportFieldDefForColumnKey(
  columnKey: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
): ReportFieldDefinition | undefined {
  return findReportTableFieldDefinition(
    columnKey,
    entityMetadata,
    outputRows,
    fieldMap,
    tableMetadataByRowId,
    referenceEntityMetadataByName,
  );
}

export function resolveReportColumnLabel(
  columnKey: string,
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
  entities: ReportEntityListItem[] = [],
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
    referenceEntityMetadataByName,
    entities,
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
      referenceEntityMetadataByName,
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

/** Порядок колонок: сначала selectedFields из запроса, затем остальные ключи из content. */
export function orderReportContentColumnKeys(
  contentKeys: string[],
  selectedFieldNames: string[] | undefined,
): string[] {
  if (!selectedFieldNames?.length) {
    return contentKeys;
  }
  const contentSet = new Set(contentKeys);
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const name of selectedFieldNames) {
    if (!contentSet.has(name) || seen.has(name)) continue;
    ordered.push(name);
    seen.add(name);
  }

  for (const key of contentKeys) {
    if (!seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  return ordered;
}

export function isReportTableFieldLabelAutoQualified(label: string): boolean {
  return (
    label.includes(QUALIFIED_LABEL_SEPARATOR) || label.includes(ROOT_ENTITY_LABEL_SEPARATOR)
  );
}
