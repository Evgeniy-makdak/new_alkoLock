import type { Values } from '@shared/ui/search_multiple_select';

import { findRootFieldForFilterPath } from './reportFilterFieldPath';

import type {
  ReportEntityMetadata,
  ReportFieldDefinition,
  ReportOutputRow,
  ReportQueryFilter,
  ReportUiFilterSelections,
} from '../types/reportApiTypes';

/** Совпадает с PRIMARY_REPORT_OUTPUT_ROW_ID / reportOutputOperationKey — без тяжёлых импортов. */
const PRIMARY_ROW_ID = 'primary';

function operationKeyForRow(rowId: string): string {
  return `__report_output_operation__${rowId}`;
}

function createEmptyOutputRow(id: string): ReportOutputRow {
  return {
    id,
    selectedOutputFields: [],
    reportTableFields: [],
    filterSelections: {},
    nestedEntityFilterByField: {},
  };
}

function filterValuesToUi(values: unknown[] | undefined): Values {
  return (values ?? []).flatMap((raw) => {
    if (raw == null) return [];
    if (typeof raw === 'object' && !Array.isArray(raw) && 'value' in (raw as object)) {
      const item = raw as { value?: unknown; label?: unknown };
      if (item.value == null || item.value === '') return [];
      return [
        {
          value: item.value as string | number,
          label: String(item.label ?? item.value),
        },
      ];
    }
    return [{ value: raw as string | number, label: String(raw) }];
  });
}

function resolveOperationSelection(
  operator: string,
  field: ReportFieldDefinition | undefined,
  rowId: string,
): ReportUiFilterSelections {
  const opKey = operationKeyForRow(rowId);
  const code = (operator ?? '').trim();
  if (!code) return {};

  const ops = field?.availableOperations ?? [];
  const match =
    ops.find((op) => op.code === code) ??
    ops.find((op) => op.code.toLowerCase() === code.toLowerCase());
  if (match) {
    return {
      [opKey]: [{ value: match.code, label: (match.label || '').trim() || match.code }],
    };
  }
  // Нет списка ops (metadata ещё узкая) — код; UI подменит label из options.
  if (!ops.length) {
    return { [opKey]: [{ value: code, label: code }] };
  }
  // Иначе не ставим чужой код — ReportOutputFilterRow сбросит невалидный оператор.
  const fallback =
    ops.find((op) => op.code === 'in') ??
    ops.find((op) => op.code === 'equals') ??
    ops[0];
  return fallback
    ? {
        [opKey]: [
          { value: fallback.code, label: (fallback.label || '').trim() || fallback.code },
        ],
      }
    : {};
}

/** Листовое поле nested path для availableOperations / подписей. */
function resolveNestedLeafField(
  primary: ReportFieldDefinition,
  nestedPath: string[],
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
): ReportFieldDefinition | undefined {
  const ref = primary.referenceEntity?.trim();
  if (!ref || !nestedPath.length) return undefined;
  let meta: ReportEntityMetadata | null | undefined = nestedByName[ref] ?? null;
  for (let i = 0; i < nestedPath.length; i += 1) {
    const step = nestedPath[i];
    const field = meta?.fields?.find((f) => f.fieldName === step);
    if (!field) return undefined;
    if (i === nestedPath.length - 1) return field;
    const nextRef = field.referenceEntity?.trim();
    if (!nextRef) return field;
    meta = nestedByName[nextRef] ?? null;
  }
  return undefined;
}

/** Общие фильтры сущности (не отдельное «Поле результата»). */
function tryMapGroupFilterControl(fieldName: string): string | null {
  if (fieldName === 'eventsForFront.event') return '__group_eventType';
  if (fieldName === 'email') return '__group_email';
  return null;
}

function buildRowFromFilter(
  filter: ReportQueryFilter,
  metadata: ReportEntityMetadata,
  rowId: string,
  tableFields: Values,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
): ReportOutputRow | null {
  const fieldName = (filter.fieldName ?? '').trim();
  if (!fieldName) return null;

  const values = filterValuesToUi(filter.values);
  const groupControl = tryMapGroupFilterControl(fieldName);
  if (groupControl) {
    // Shared group-control живёт на строке без обязательного selectedOutputFields.
    const row = createEmptyOutputRow(rowId);
    row.reportTableFields = tableFields;
    row.filterSelections = {
      [groupControl]: values,
      ...resolveOperationSelection(filter.operator, undefined, rowId),
    };
    return row;
  }

  const binding = findRootFieldForFilterPath(fieldName, metadata);
  if (!binding) return null;

  const { primary, nestedPath } = binding;
  const row = createEmptyOutputRow(rowId);
  row.reportTableFields = tableFields;
  const leaf =
    nestedPath.length > 0
      ? resolveNestedLeafField(primary, nestedPath, nestedByName)
      : undefined;
  row.selectedOutputFields = [
    {
      value: fieldName,
      label:
        (leaf?.label || primary.label || '').trim() ||
        fieldName,
    },
  ];

  const ref = primary.referenceEntity?.trim();
  const isEntity = (primary.type ?? '').toUpperCase() === 'ENTITY' || Boolean(ref);

  if (isEntity && nestedPath.length) {
    row.nestedEntityFilterByField = {
      [primary.fieldName]: {
        path: nestedPath,
        values,
      },
    };
    row.filterSelections = {
      ...resolveOperationSelection(filter.operator, leaf, rowId),
    };
    return row;
  }

  if (isEntity && !nestedPath.length) {
    // device / vehicle без атрибута — значения как id сущности.
    const leaf = resolveNestedLeafField(primary, ['id'], nestedByName);
    row.nestedEntityFilterByField = {
      [primary.fieldName]: {
        path: ['id'],
        values,
      },
    };
    row.filterSelections = {
      ...resolveOperationSelection(filter.operator, leaf ?? primary, rowId),
    };
    return row;
  }

  // Скаляр корня (id, name, …); fieldName.endsWith('.id') уже отсечён выше для ENTITY.
  const controlId = primary.fieldName;
  row.filterSelections = {
    [controlId]: values,
    ...resolveOperationSelection(filter.operator, primary, rowId),
  };
  return row;
}

function clusterFiltersByGroup(filters: ReportQueryFilter[]): ReportQueryFilter[][] {
  if (!filters.length) return [];
  const hasGroups = filters.some((f) => f.group != null && Number.isFinite(Number(f.group)));
  if (!hasGroups) {
    return filters.map((f) => [f]);
  }

  const order: number[] = [];
  const map = new Map<number, ReportQueryFilter[]>();
  for (const filter of filters) {
    const group = Number(filter.group);
    const key = Number.isFinite(group) ? group : 0;
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(filter);
  }
  return order.map((key) => map.get(key)!);
}

export type RestoreReportComposeFiltersOptions = {
  /** Nested metadata для подписей операторов на листьях path. */
  referenceEntityMetadataByName?: Record<string, ReportEntityMetadata | null | undefined>;
};

/**
 * Восстанавливает UI-строки «Фильтрация» из filters[] тела query / AI-черновика.
 * Не трогает остальной compose — только outputRows.
 */
export function restoreReportComposeFiltersFromQuery(
  filters: ReportQueryFilter[] | undefined,
  metadata: ReportEntityMetadata | null | undefined,
  tableFields: Values = [],
  options?: RestoreReportComposeFiltersOptions,
): ReportOutputRow[] {
  const nestedByName = options?.referenceEntityMetadataByName ?? {};
  const list = (filters ?? []).filter((f) => (f.fieldName ?? '').trim());
  if (!list.length || !metadata?.fields?.length) {
    const row = createEmptyOutputRow(PRIMARY_ROW_ID);
    row.reportTableFields = tableFields;
    return [row];
  }

  const clusters = clusterFiltersByGroup(list);
  const rows: ReportOutputRow[] = [];

  for (let index = 0; index < clusters.length; index++) {
    const cluster = clusters[index];
    // В одной group-группе AI/бэк обычно кладёт одно условие; берём первое
    // (lat+lon пары пока не склеиваем — редкий AI-кейс).
    const filter = cluster[0];
    // Стабильный id (без Date.now) — applyDraft грузит nested metadata по тому же ключу.
    const rowId = index === 0 ? PRIMARY_ROW_ID : `report-row-ai-${index}`;
    const row = buildRowFromFilter(
      filter,
      metadata,
      rowId,
      index === 0 ? tableFields : [],
      nestedByName,
    );
    if (row) rows.push(row);
  }

  if (!rows.length) {
    const row = createEmptyOutputRow(PRIMARY_ROW_ID);
    row.reportTableFields = tableFields;
    return [row];
  }

  // tableFields только на primary
  rows[0] = {
    ...rows[0],
    id: PRIMARY_ROW_ID,
    reportTableFields: tableFields,
  };
  return rows;
}
