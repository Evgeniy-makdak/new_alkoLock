import type {
  ReportEntityListItem,
  ReportEntityMetadata,
} from '../types/reportApiTypes';
import type {
  ReportAiPromptContext,
  ReportAiPromptEntity,
  ReportAiPromptEntityField,
} from '../types/reportAiComposeTypes';

const MAX_ALLOWED_VALUES = 40;
const MAX_FIELDS_PER_ENTITY = 80;

function compressField(field: ReportEntityMetadata['fields'][number]): ReportAiPromptEntityField {
  const ops = (field.availableOperations ?? [])
    .map((o) => String(o.code ?? '').trim())
    .filter(Boolean)
    .slice(0, 20);
  const fns = (field.availableFunctions ?? [])
    .map((o) => String(o.code ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);
  const allowedRaw = field.allowedValues ?? [];
  const allowedValues: Array<string | number> = [];
  for (const item of allowedRaw.slice(0, MAX_ALLOWED_VALUES)) {
    if (item == null) continue;
    if (typeof item === 'string' || typeof item === 'number') {
      allowedValues.push(item);
      continue;
    }
    const o = item as { value?: unknown; code?: unknown; name?: unknown; label?: unknown };
    const v = o.value ?? o.code ?? o.name ?? o.label;
    if (v == null || v === '') continue;
    if (typeof v === 'string' || typeof v === 'number') allowedValues.push(v);
    else allowedValues.push(String(v));
  }

  return {
    fieldName: field.fieldName,
    label: (field.label ?? '').trim() || field.fieldName,
    type: field.type ?? 'STRING',
    filterable: Boolean(field.filterable),
    groupable: Boolean(field.groupable),
    selectable: field.selectable !== false,
    sortable: Boolean(field.sortable),
    referenceEntity: field.referenceEntity ?? null,
    ...(ops.length ? { availableOperations: ops } : {}),
    ...(fns.length ? { availableFunctions: fns } : {}),
    ...(allowedValues.length ? { allowedValues } : {}),
  };
}

export function compressReportEntityMetadata(
  metadata: ReportEntityMetadata | null | undefined,
): ReportAiPromptEntity | null {
  if (!metadata?.entityName) return null;
  const fields = (metadata.fields ?? [])
    .slice(0, MAX_FIELDS_PER_ENTITY)
    .map(compressField);
  return {
    entityName: metadata.entityName,
    label: (metadata.label ?? '').trim() || metadata.entityName,
    fields,
  };
}

export type BuildReportAiPromptContextParams = {
  entities: ReportEntityListItem[];
  metadataByEntity: Record<string, ReportEntityMetadata | null | undefined>;
  catalogs?: ReportAiPromptContext['catalogs'];
  locale?: string;
  now?: Date;
};

/** Сжатый каталог для промпта Gemini / локального fallback. */
export function buildReportAiPromptContext(
  params: BuildReportAiPromptContextParams,
): ReportAiPromptContext {
  const metadataByEntity: ReportAiPromptContext['metadataByEntity'] = {};
  for (const [name, meta] of Object.entries(params.metadataByEntity)) {
    const compressed = compressReportEntityMetadata(meta ?? null);
    if (compressed) metadataByEntity[name] = compressed;
  }

  return {
    entities: (params.entities ?? []).map((e) => ({
      entityName: e.entityName,
      label: (e.label ?? '').trim() || e.entityName,
    })),
    metadataByEntity,
    ...(params.catalogs ? { catalogs: params.catalogs } : {}),
    locale: params.locale ?? 'ru',
    nowIso: (params.now ?? new Date()).toISOString(),
  };
}

export function buildReportAiSystemPrompt(): string {
  return [
    'Ты помощник по формированию отчётов AlcoLock.',
    'По текстовому запросу пользователя верни ТОЛЬКО JSON (без markdown) по схеме черновика отчёта.',
    'Не пиши SQL. Используй только entityName и fieldName из переданного context.',
    'selectedFields — колонки отчёта (selectable поля). filters — условия (filterable + availableOperations).',
    'Для «статистики» / группировок используй groupBy (groupable) и при необходимости having.',
    'viewMode: "chart" только если пользователь явно просит график/диаграмму; иначе "table".',
    'Для pie/bar укажи chartSpec.type и encoding.categoryField / valueField при возможности.',
    'Относительные периоды («предыдущий квартал») клади в relativeDateRanges, не в абсолютные даты.',
    'Имена филиалов, серийники алкозамков, подписи событий — в resolveHints (kind + query), не угадывай id.',
    'Если в запросе смешаны график и сортировка списка — выбери один viewMode и опиши ignoredHints.',
    'explanation — кратко по-русски, что понял.',
    'Схема draft:',
    '{',
    '  "entityName": string,',
    '  "selectedFields": [{"fieldName": string, "aggregation"?: string}],',
    '  "filters": [{"fieldName": string, "operator": string, "values"?: unknown[]}],',
    '  "groupBy"?: string[],',
    '  "having"?: object[],',
    '  "sort"?: string[],',
    '  "viewMode": "table"|"chart",',
    '  "chartSpec"?: { "type"?: string, "encoding"?: { "categoryField"?: string|null, "valueField"?: string|null } },',
    '  "explanation": string,',
    '  "ignoredHints"?: string[],',
    '  "relativeDateRanges"?: [{"fieldName": string, "range": "previous_quarter"|"previous_month"|"previous_week"|"current_month"|"current_year"|"last_7_days"|"last_30_days"}],',
    '  "resolveHints"?: [{"fieldName": string, "kind": "branch"|"device"|"vehicle"|"user"|"eventType", "query": string}]',
    '}',
  ].join('\n');
}

export function buildReportAiUserPrompt(userText: string, context: ReportAiPromptContext): string {
  return [
    `Запрос пользователя:\n${userText.trim()}`,
    '',
    `Контекст (JSON):\n${JSON.stringify(context)}`,
  ].join('\n');
}
