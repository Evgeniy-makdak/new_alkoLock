import { fetchReportEntities, fetchReportEntityMetadata } from '../../api/reportsApi';
import { buildReportColumnHeaderLabels } from '../../lib/buildReportColumnHeaderLabels';
import {
  applyReportEntityListLabel,
  collectReferenceEntitiesFromMetadata,
  findReportFieldDefForColumnKey,
} from '../../lib/buildReportTableFieldOptions';
import {
  type ReportDateTimePrecision,
  resolveReportDateTimePrecision,
} from '../../lib/formatReportTableDateTime';
import { isReportDateTimeField } from '../../lib/reportFieldFilterKind';
import {
  DEVICE_EVENT_REPORT_ROW_COLUMNS,
  REPORT_RESULT_COLUMNS_BY_REFERENCE,
} from '../../lib/reportResultTableColumns';
import type {
  ReportEntityListItem,
  ReportEntityMetadata,
  ReportQueryRequest,
} from '../../types/reportApiTypes';

type WidgetMetadataBundle = {
  metadata: ReportEntityMetadata;
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>;
  entities: ReportEntityListItem[];
};

/** Кэш metadata по корневой сущности: виджеты одной сущности не дублируют запросы. */
const bundleCache = new Map<string, Promise<WidgetMetadataBundle | null>>();
const STATIC_DATE_COLUMN_NAMES = new Set(
  [...DEVICE_EVENT_REPORT_ROW_COLUMNS, ...Object.values(REPORT_RESULT_COLUMNS_BY_REFERENCE).flat()]
    .filter((column) => column.isDateTime)
    .map((column) => column.field),
);

async function loadBundle(entityName: string): Promise<WidgetMetadataBundle | null> {
  let entities: ReportEntityListItem[] = [];
  try {
    entities = await fetchReportEntities();
  } catch {
    entities = [];
  }

  const rootRaw = await fetchReportEntityMetadata(entityName);
  const metadata = applyReportEntityListLabel(rootRaw, entities);

  // Вторичная metadata — тот же обход, что в reportsStore.loadAllReferenceEntityMetadataForReport.
  const referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null> = {};
  const queue = [...collectReferenceEntitiesFromMetadata(metadata)];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const ref = (queue.shift() ?? '').trim();
    if (!ref || seen.has(ref)) continue;
    seen.add(ref);
    try {
      const loaded = await fetchReportEntityMetadata(metadata.entityName || entityName, ref);
      referenceEntityMetadataByName[ref] = loaded;
      for (const nested of collectReferenceEntitiesFromMetadata(loaded)) {
        if (!seen.has(nested)) queue.push(nested);
      }
    } catch {
      // нет вторичной metadata — колонка останется с технической подписью
    }
  }

  return { metadata, referenceEntityMetadataByName, entities };
}

function getBundle(entityName: string): Promise<WidgetMetadataBundle | null> {
  const cached = bundleCache.get(entityName);
  if (cached) return cached;
  const promise = loadBundle(entityName).catch((): null => {
    bundleCache.delete(entityName);
    return null;
  });
  bundleCache.set(entityName, promise);
  return promise;
}

/**
 * Русскоязычные заголовки колонок виджета дашборда, когда снимок columnHeaderLabels
 * недоступен (например, виджет восстановлен с бэка без локального кэша).
 * Используется тот же построитель подписей, что и для грида вкладки «Отчёты».
 */
export async function resolveWidgetColumnHeaderLabels(
  entityName: string,
  body: ReportQueryRequest,
  columnKeys: string[],
): Promise<Record<string, string>> {
  if (!entityName || !columnKeys.length) return {};
  const bundle = await getBundle(entityName);
  if (!bundle) return {};
  const sampleRow: Record<string, unknown> = {};
  for (const key of columnKeys) sampleRow[key] = null;
  try {
    return buildReportColumnHeaderLabels(
      [sampleRow],
      bundle.metadata,
      body,
      [],
      {},
      bundle.referenceEntityMetadataByName,
      bundle.entities,
    );
  } catch {
    return {};
  }
}

/** Date precision by content key, using the same metadata and path rules as report tables. */
export async function resolveWidgetDateTimeColumnFormats(
  entityName: string,
  body: ReportQueryRequest,
): Promise<Record<string, ReportDateTimePrecision>> {
  if (!entityName) return {};

  const bundle = await getBundle(entityName);
  if (!bundle) return {};

  return resolveWidgetDateTimeColumnFormatsFromMetadata(
    body,
    bundle.metadata,
    bundle.referenceEntityMetadataByName,
  );
}

export function resolveWidgetDateTimeColumnFormatsFromMetadata(
  body: ReportQueryRequest,
  metadata: ReportEntityMetadata,
  referenceEntityMetadataByName: Record<string, ReportEntityMetadata | null>,
): Record<string, ReportDateTimePrecision> {
  const selectedFields = body.selectedFields ?? [];
  if (!selectedFields.length) return {};

  const fieldMap = new Map(metadata.fields.map((field) => [field.fieldName, field]));
  const formats: Record<string, ReportDateTimePrecision> = {};

  for (const selectedField of selectedFields) {
    const fieldName = (selectedField.fieldName ?? '').trim();
    if (!fieldName) continue;

    const fieldDef = findReportFieldDefForColumnKey(
      fieldName,
      metadata,
      [],
      fieldMap,
      {},
      referenceEntityMetadataByName,
    );
    const precision = resolveReportDateTimePrecision(fieldName);
    const leaf = fieldName.slice(fieldName.lastIndexOf('.') + 1);
    const isDateTime =
      (fieldDef != null && isReportDateTimeField(fieldDef)) ||
      precision === 'day' ||
      STATIC_DATE_COLUMN_NAMES.has(leaf);
    if (!isDateTime) continue;

    formats[fieldName] = precision;
    const alias = (selectedField.alias ?? '').trim();
    if (alias) formats[alias] = precision;
  }

  return formats;
}
