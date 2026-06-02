import type { Values } from '@shared/ui/search_multiple_select';

import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
} from '../types/reportApiTypes';

const MAX_SELECTED_FIELD_PATH_SEGMENTS = 3;

/** @deprecated Используйте ROOT_ENTITY_LABEL_SEPARATOR; оставлено для распознавания старых подписей. */
export const QUALIFIED_LABEL_SEPARATOR = ' · ';

/** Между сущностью и полем (например «Отчёт по событиям -> Идентификатор», «ТС -> Марка»). */
export const ROOT_ENTITY_LABEL_SEPARATOR = ' -> ';

export type ReportTableFieldOptionDraft = {
  value: string;
  baseLabel: string;
  sourceLabel: string;
  qualifyAs: 'root' | 'nested';
  /** metadata сущности листа + fieldName — один лист = один путь (самый короткий). */
  leafKey: string;
};

export function buildReportTableFieldLeafKey(
  referenceEntity: string,
  fieldName: string,
): string {
  return `${referenceEntity.trim()}:${fieldName.trim()}`;
}

/**
 * Один и тот же лист (например MonitoringDevice.inactiveSince) не должен появляться
 * как device.inactiveSince, action.device.inactiveSince и vehicle.monitoringDevice.inactiveSince.
 */
/** Допустимые fieldName для selectedFields (после дедупа и лимита глубины). */
export function buildAllowedReportTableFieldPaths(
  entityMetadata: ReportEntityMetadata | null | undefined,
  outputRows: ReportOutputRow[],
  fieldMap: Map<string, ReportFieldDefinition>,
  tableMetadataByRowId: Record<string, ReportEntityMetadata | null>,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {},
  entities: ReportEntityListItem[] = [],
): Set<string> {
  const options = mergeAllReportTableFieldOptions(
    entityMetadata,
    outputRows,
    fieldMap,
    tableMetadataByRowId,
    referenceEntityMetadataByName,
    entities,
  );
  return new Set(options.map((option) => String(option.value)));
}

export function dedupeReportTableFieldDraftsByShortestPath(
  drafts: ReportTableFieldOptionDraft[],
): ReportTableFieldOptionDraft[] {
  const winnerByLeaf = new Map<string, ReportTableFieldOptionDraft>();

  for (const draft of drafts) {
    const prev = winnerByLeaf.get(draft.leafKey);
    if (!prev) {
      winnerByLeaf.set(draft.leafKey, draft);
      continue;
    }
    const prevDepth = prev.value.split('.').length;
    const nextDepth = draft.value.split('.').length;
    if (
      nextDepth < prevDepth ||
      (nextDepth === prevDepth && draft.value.localeCompare(prev.value) < 0)
    ) {
      winnerByLeaf.set(draft.leafKey, draft);
    }
  }

  const emitted = new Set<string>();
  const result: ReportTableFieldOptionDraft[] = [];
  for (const draft of drafts) {
    if (winnerByLeaf.get(draft.leafKey) !== draft) continue;
    if (emitted.has(draft.leafKey)) continue;
    emitted.add(draft.leafKey);
    result.push(draft);
  }
  return result;
}

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
  const baseLabels = drafts.map((draft) => buildReportTableFieldOptionLabel(draft));
  const duplicateCount = new Map<string, number>();
  for (const label of baseLabels) {
    duplicateCount.set(label, (duplicateCount.get(label) ?? 0) + 1);
  }

  return drafts.map((draft, index) => {
    const baseLabel = baseLabels[index];
    const hasDuplicate = (duplicateCount.get(baseLabel) ?? 0) > 1;
    const label = hasDuplicate ? `${baseLabel} (${draft.value})` : baseLabel;
    return {
      value: draft.value,
      label,
    };
  });
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
  const type = (field.type ?? '').toUpperCase();
  return field.selectable === true && type !== 'ENTITY';
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

  const entitySourceLabel = resolveReportEntitySourceLabel(entityMetadata, entities);
  const seen = new Set<string>();
  const drafts: ReportTableFieldOptionDraft[] = [];

  for (const f of entityMetadata.fields) {
    if (!isReportTableSelectableField(f)) continue;
    if (seen.has(f.fieldName)) continue;
    seen.add(f.fieldName);
    drafts.push({
      value: f.fieldName,
      baseLabel: f.label || f.fieldName,
      sourceLabel: entitySourceLabel,
      qualifyAs: 'root',
      leafKey: buildReportTableFieldLeafKey(entityMetadata.entityName, f.fieldName),
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
  const rootEntityName = entityMetadata.entityName?.trim() ?? '';

  const entitySourceLabel = resolveReportEntitySourceLabel(entityMetadata, entities);
  const seen = new Set<string>();
  const drafts: ReportTableFieldOptionDraft[] = [];

  for (const f of entityMetadata.fields) {
    if (!isReportTableSelectableField(f)) continue;
    const value = f.fieldName;
    if (seen.has(value)) continue;
    seen.add(value);
    drafts.push({
      value,
      baseLabel: f.label || f.fieldName,
      sourceLabel: entitySourceLabel,
      qualifyAs: 'root',
      leafKey: buildReportTableFieldLeafKey(rootEntityName, f.fieldName),
    });
  }

  for (const parentField of entityMetadata.fields) {
    const refEntity = parentField.referenceEntity?.trim();
    if (!refEntity) continue;

    const walkNested = (
      prefix: string,
      sourceLabel: string,
      referenceEntity: string,
      visitedEntities: Set<string>,
    ) => {
      const meta = referenceEntityMetadataByName[referenceEntity] ?? null;
      if (!meta?.fields?.length) return;

      for (const f of meta.fields) {
        const value = prefixedFieldName(prefix, f.fieldName);
        const segmentsCount = value.split('.').length;
        if (isReportTableSelectableField(f) && !seen.has(value)) {
          if (segmentsCount > MAX_SELECTED_FIELD_PATH_SEGMENTS) {
            continue;
          }
          seen.add(value);
          drafts.push({
            value,
            baseLabel: f.label || f.fieldName,
            sourceLabel,
            qualifyAs: 'nested',
            leafKey: buildReportTableFieldLeafKey(referenceEntity, f.fieldName),
          });
        }

        const childRef = f.referenceEntity?.trim();
        if (!childRef || visitedEntities.has(childRef)) continue;
        // Не уходим обратно в корневую сущность отчёта: это даёт циклические пути
        // вроде vehicleBind.vehicle.monitoringDevice.id и ломает selectedFields.
        if (rootEntityName && childRef === rootEntityName) continue;
        const nextVisited = new Set(visitedEntities);
        nextVisited.add(childRef);
        if (segmentsCount >= MAX_SELECTED_FIELD_PATH_SEGMENTS) continue;
        walkNested(
          value,
          (f.label ?? '').trim() || f.fieldName,
          childRef,
          nextVisited,
        );
      }
    };

    walkNested(
      parentField.fieldName,
      (parentField.label ?? '').trim() || parentField.fieldName,
      refEntity,
      new Set<string>([refEntity]),
    );
  }

  return buildReportTableFieldOptionLabels(dedupeReportTableFieldDraftsByShortestPath(drafts));
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
    // Fallback по leaf-name допустим только для одноуровневого пути.
    // Для глубоких путей (a.b.c) это приводит к ложному совпадению и невалидному fieldName в payload.
    if (!leaf.includes('.')) {
      const byLeaf = tableFields.find((f) => f.fieldName === leaf);
      if (byLeaf) return byLeaf;
    }
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
    if (!leaf.includes('.')) {
      return tableFields.find((f) => f.fieldName === leaf);
    }
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
      keys.add(key);
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
