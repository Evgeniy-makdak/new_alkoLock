import { fetchBranchOfficesForReport, flattenBranchOffices } from './branchOfficeReportOptions';
import { fetchEventTypesForReport } from './eventsForFrontReportOptions';
import { fetchBranchVehiclesForReport } from './fetchBranchVehiclesForReport';
import { fetchReportDomainEntityRecords } from './fetchReportDomainEntityRecords';
import { applyRelativeDateRangesToDraft } from './reportAiResolveRelativeDates';
import { matchVehicleMakesToQuery } from './reportAiVehicleSynonyms';
import { createDefaultChartSpec, normalizeChartSpec } from '../types/chartSpec';

import type {
  ReportAiComposeDraft,
  ReportAiResolveHint,
  ReportAiValidatedCompose,
} from '../types/reportAiComposeTypes';
import type {
  ReportEntityMetadata,
  ReportQueryFilter,
  ReportSelectedFieldPayload,
} from '../types/reportApiTypes';

function normalizeOperator(op: string): string {
  return (op ?? '').trim();
}

function collectFieldIndex(
  metadata: ReportEntityMetadata | null | undefined,
  nestedByName: Record<string, ReportEntityMetadata | null | undefined>,
): Map<string, { filterable: boolean; groupable: boolean; selectable: boolean; ops: Set<string> }> {
  const map = new Map<
    string,
    { filterable: boolean; groupable: boolean; selectable: boolean; ops: Set<string> }
  >();

  const addEntity = (prefix: string, meta: ReportEntityMetadata | null | undefined, depth: number) => {
    if (!meta?.fields || depth > 2) return;
    for (const field of meta.fields) {
      const path = prefix ? `${prefix}.${field.fieldName}` : field.fieldName;
      map.set(path, {
        filterable: Boolean(field.filterable),
        groupable: Boolean(field.groupable),
        selectable: field.selectable !== false && (field.type ?? '').toUpperCase() !== 'ENTITY',
        ops: new Set((field.availableOperations ?? []).map((o) => String(o.code))),
      });
      const ref = field.referenceEntity?.trim();
      if (ref && (field.type ?? '').toUpperCase() === 'ENTITY') {
        addEntity(path, nestedByName[ref] ?? null, depth + 1);
      }
    }
  };

  addEntity('', metadata, 0);
  return map;
}

function pickDefaultSelectedFields(metadata: ReportEntityMetadata): ReportSelectedFieldPayload[] {
  const preferred = ['id', 'timestamp', 'reportedAt', 'name', 'surname'];
  const selectable = metadata.fields.filter(
    (f) => f.selectable !== false && (f.type ?? '').toUpperCase() !== 'ENTITY',
  );
  const out: ReportSelectedFieldPayload[] = [];
  for (const name of preferred) {
    if (selectable.some((f) => f.fieldName === name)) {
      out.push({ fieldName: name });
    }
  }
  if (!out.length && selectable[0]) {
    out.push({ fieldName: selectable[0].fieldName });
  }
  return out;
}

function normalizeDraftShape(raw: unknown): ReportAiComposeDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const entityName = String(o.entityName ?? '').trim();
  if (!entityName) return null;

  const selectedFields = Array.isArray(o.selectedFields)
    ? (o.selectedFields as ReportSelectedFieldPayload[])
        .map((f) => ({
          fieldName: String(f?.fieldName ?? '').trim(),
          ...(f?.aggregation ? { aggregation: String(f.aggregation) } : {}),
          ...(f?.alias ? { alias: String(f.alias) } : {}),
        }))
        .filter((f) => f.fieldName)
    : [];

  const filters = Array.isArray(o.filters)
    ? (o.filters as ReportQueryFilter[])
        .map((f) => ({
          fieldName: String(f?.fieldName ?? '').trim(),
          operator: normalizeOperator(String(f?.operator ?? 'equals')),
          ...(f?.values !== undefined ? { values: f.values } : {}),
          ...(f?.group != null ? { group: Number(f.group) } : {}),
        }))
        .filter((f) => f.fieldName)
    : [];

  const viewMode = o.viewMode === 'chart' ? 'chart' : 'table';

  return {
    entityName,
    selectedFields,
    filters,
    groupBy: Array.isArray(o.groupBy)
      ? o.groupBy.map((x) => String(x).trim()).filter(Boolean)
      : undefined,
    having: Array.isArray(o.having) ? (o.having as ReportAiComposeDraft['having']) : undefined,
    havingConnects: Array.isArray(o.havingConnects)
      ? (o.havingConnects as ReportAiComposeDraft['havingConnects'])
      : undefined,
    logicConnects: Array.isArray(o.logicConnects)
      ? (o.logicConnects as ReportAiComposeDraft['logicConnects'])
      : undefined,
    sort: Array.isArray(o.sort) ? o.sort.map((x) => String(x).trim()).filter(Boolean) : undefined,
    viewMode,
    chartSpec: o.chartSpec && typeof o.chartSpec === 'object' ? (o.chartSpec as object) : null,
    explanation: String(o.explanation ?? '').trim() || entityName,
    ignoredHints: Array.isArray(o.ignoredHints)
      ? o.ignoredHints.map((x) => String(x)).filter(Boolean)
      : undefined,
    relativeDateRanges: Array.isArray(o.relativeDateRanges)
      ? (o.relativeDateRanges as ReportAiComposeDraft['relativeDateRanges'])
      : undefined,
    resolveHints: Array.isArray(o.resolveHints)
      ? (o.resolveHints as ReportAiResolveHint[])
      : undefined,
  };
}

function scoreNameMatch(haystack: string, needle: string): number {
  const a = haystack.trim().toLowerCase();
  const b = needle.trim().toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  return 0;
}

/** Разбивает query на несколько значений: «Жигули, а также Москвич» → [«Жигули», «Москвич»]. */
function splitResolveQuery(query: string): string[] {
  return (query ?? '')
    .split(/,|;|\bи\b|\bа также\b|\bили\b|\bлибо\b/gi)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveHintToValues(hint: ReportAiResolveHint): Promise<unknown[] | null> {
  const q = hint.query.trim();
  if (!q) return null;

  switch (hint.kind) {
    case 'branch': {
      const nodes = flattenBranchOffices(await fetchBranchOfficesForReport(q));
      let best: { id: number | string; score: number } | null = null;
      for (const n of nodes) {
        if (n.id == null) continue;
        const score = scoreNameMatch(String(n.name ?? ''), q);
        if (score > (best?.score ?? 0)) best = { id: n.id, score };
      }
      return best && best.score >= 80 ? [best.id] : null;
    }
    case 'device': {
      const records = await fetchReportDomainEntityRecords({
        entityName: 'MonitoringDevice',
        searchQuery: q,
        limit: 25,
      });
      for (const raw of records) {
        const r = raw as { id?: unknown; serialNumber?: unknown; name?: unknown };
        if (String(r.serialNumber ?? '') === q || String(r.name ?? '') === q) {
          return r.id != null ? [r.id] : null;
        }
      }
      const first = records[0] as { id?: unknown } | undefined;
      return first?.id != null ? [first.id] : null;
    }
    case 'vehicle': {
      const records = await fetchReportDomainEntityRecords({
        entityName: 'Vehicle',
        searchQuery: q,
        limit: 25,
      });
      const first = records[0] as { id?: unknown } | undefined;
      return first?.id != null ? [first.id] : null;
    }
    case 'vehicleMake': {
      // «Жигули, а также Москвич» → значения manufacturer из справочника ТС.
      const cars = await fetchBranchVehiclesForReport();
      const makes = Array.from(
        new Set(
          cars
            .map((c) => String((c as unknown as { manufacturer?: unknown })?.manufacturer ?? '').trim())
            .filter(Boolean),
        ),
      );
      const values: string[] = [];
      for (const part of splitResolveQuery(q)) {
        values.push(...matchVehicleMakesToQuery(part, makes));
      }
      return values.length ? Array.from(new Set(values)) : null;
    }
    case 'vehicleModel': {
      const cars = await fetchBranchVehiclesForReport();
      const models = Array.from(
        new Set(
          cars
            .map((c) => String((c as unknown as { model?: unknown })?.model ?? '').trim())
            .filter(Boolean),
        ),
      );
      const values: string[] = [];
      for (const part of splitResolveQuery(q)) {
        const term = part.toLowerCase();
        for (const model of models) {
          const m = model.toLowerCase();
          if (m === term || m.includes(term) || term.includes(m)) values.push(model);
        }
      }
      return values.length ? Array.from(new Set(values)) : null;
    }
    case 'user': {
      const records = await fetchReportDomainEntityRecords({
        entityName: 'User',
        searchQuery: q,
        limit: 25,
      });
      const first = records[0] as { id?: unknown } | undefined;
      return first?.id != null ? [first.id] : null;
    }
    case 'eventType': {
      // Ищем подпись события в каталоге event-types (label/event), иначе — query как value.
      try {
        const types = await fetchEventTypesForReport('');
        const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        const qNorm = norm(q);
        const matched = new Set<string>();
        for (const item of types) {
          const label = item.label != null ? String(item.label) : '';
          const event = typeof item.event === 'string' ? item.event : '';
          if (label && (norm(label).includes(qNorm) || qNorm.includes(norm(label)))) {
            matched.add(label);
          } else if (event && (norm(event).includes(qNorm) || qNorm.includes(norm(event)))) {
            matched.add(label || event);
          }
        }
        if (matched.size) return Array.from(matched);
      } catch {
        /* каталог недоступен — fallback ниже */
      }
      return [q];
    }
    default:
      return null;
  }
}

async function applyResolveHints(
  draft: ReportAiComposeDraft,
  warnings: string[],
): Promise<ReportAiComposeDraft> {
  const hints = draft.resolveHints ?? [];
  if (!hints.length) return { ...draft, resolveHints: undefined };

  const filters = [...(draft.filters ?? [])];
  for (const hint of hints) {
    const fieldName = hint.fieldName.trim();
    if (!fieldName) continue;
    try {
      const values = await resolveHintToValues(hint);
      if (!values?.length) {
        warnings.push(`Не удалось найти «${hint.query}» (${hint.kind}).`);
        continue;
      }
      const existing = filters.findIndex((f) => f.fieldName === fieldName);
      const next: ReportQueryFilter = {
        fieldName,
        operator: 'in',
        values,
      };
      if (existing >= 0) filters[existing] = next;
      else filters.push(next);
    } catch {
      warnings.push(`Ошибка поиска «${hint.query}» (${hint.kind}).`);
    }
  }

  return { ...draft, filters, resolveHints: undefined };
}

export type ValidateReportAiDraftParams = {
  rawDraft: unknown;
  rootMetadata: ReportEntityMetadata | null | undefined;
  nestedMetadataByName?: Record<string, ReportEntityMetadata | null | undefined>;
  now?: Date;
};

/**
 * Нормализация + валидация по metadata + relative dates + resolveHints.
 */
export async function validateAndResolveReportAiDraft(
  params: ValidateReportAiDraftParams,
): Promise<ReportAiValidatedCompose> {
  const warnings: string[] = [];
  let draft = normalizeDraftShape(params.rawDraft);
  if (!draft) {
    throw new Error('AI вернул некорректный черновик отчёта');
  }

  const metadata = params.rootMetadata;
  if (!metadata || metadata.entityName !== draft.entityName) {
    // entityName из draft — ищем совпадение; иначе оставляем и предупреждаем
    if (!metadata) {
      warnings.push('Metadata сущности ещё не загружена — проверка полей ограничена.');
    } else if (metadata.entityName !== draft.entityName) {
      warnings.push(
        `Сущность «${draft.entityName}» не совпадает с загруженной «${metadata.entityName}».`,
      );
    }
  }

  draft = applyRelativeDateRangesToDraft(draft, params.now ?? new Date());
  draft = await applyResolveHints(draft, warnings);

  const index = collectFieldIndex(metadata, params.nestedMetadataByName ?? {});

  const selectedFields: ReportSelectedFieldPayload[] = [];
  for (const field of draft.selectedFields) {
    const info = index.get(field.fieldName);
    if (index.size && info && !info.selectable && !info.filterable) {
      warnings.push(`Поле «${field.fieldName}» пропущено (не selectable).`);
      continue;
    }
    selectedFields.push(field);
  }
  if (!selectedFields.length && metadata) {
    selectedFields.push(...pickDefaultSelectedFields(metadata));
    warnings.push('Колонки не заданы — подставлены поля по умолчанию.');
  }

  const filters: ReportQueryFilter[] = [];
  for (const filter of draft.filters) {
    const info = index.get(filter.fieldName);
    if (index.size && info && !info.filterable) {
      warnings.push(`Фильтр «${filter.fieldName}» пропущен (не filterable).`);
      continue;
    }
    if (index.size && info && info.ops.size && !info.ops.has(filter.operator)) {
      // мягко: оставляем, бэк может принять синоним
      warnings.push(
        `Оператор «${filter.operator}» для «${filter.fieldName}» может быть не из metadata.`,
      );
    }
    filters.push(filter);
  }

  const groupBy = (draft.groupBy ?? []).filter((path) => {
    const info = index.get(path);
    if (index.size && info && !info.groupable) {
      warnings.push(`groupBy «${path}» пропущен (не groupable).`);
      return false;
    }
    return true;
  });

  let viewMode = draft.viewMode;
  const ignoredHints = [...(draft.ignoredHints ?? [])];
  if (viewMode === 'chart' && (draft.sort?.length ?? 0) > 0) {
    ignoredHints.push('Сортировка списка не применяется в режиме графика.');
  }

  const chartSpec =
    viewMode === 'chart'
      ? normalizeChartSpec({
          ...createDefaultChartSpec(),
          ...(draft.chartSpec ?? {}),
          type: (draft.chartSpec as { type?: string } | null)?.type ?? 'pie',
        })
      : undefined;

  return {
    draft: {
      ...draft,
      selectedFields,
      filters,
      groupBy: groupBy.length ? groupBy : undefined,
      viewMode,
      chartSpec,
      ignoredHints: ignoredHints.length ? ignoredHints : undefined,
      explanation: draft.explanation,
    },
    warnings,
  };
}

export function parseReportAiModelJson(text: string): unknown {
  const trimmed = (text ?? '').trim();
  if (!trimmed) throw new Error('Пустой ответ модели');
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  return JSON.parse(body);
}
