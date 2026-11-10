import { fetchReportEntities, fetchReportEntityMetadata } from '../../api/reportsApi';
import { buildReportColumnHeaderLabels } from '../../lib/buildReportColumnHeaderLabels';
import {
  applyReportEntityListLabel,
  collectReferenceEntitiesFromMetadata,
} from '../../lib/buildReportTableFieldOptions';
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
