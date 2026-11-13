import {
  collectReportContentColumnKeys,
  isReportTableFieldLabelAutoQualified,
  orderReportContentColumnKeys,
} from '../../lib/buildReportTableFieldOptions';
import { buildDuplicateColumnKey } from '../../lib/reportColumnDuplicate';
import { planReportCompositeResultColumns } from '../../lib/reportEntityCompositeFields';
import {
  decodeReportFieldAliasForUi,
  extractReportTableFieldLabelLeaf,
} from '../../lib/reportSelectedFieldAliases';
import type {
  ReportQueryRequest,
  ReportSelectedFieldPayload,
} from '../../types/reportApiTypes';
import { resolveWidgetColumnHeaderLabels } from './resolveWidgetColumnHeaderLabels';

/** Порядок колонок как на вкладке «Отчёты» (selectedFields + composite). */
export function orderWidgetPreviewColumns(
  content: Array<Record<string, unknown>>,
  body: ReportQueryRequest | undefined,
  limit = 8,
): string[] {
  const selectedFields = body?.selectedFields ?? [];
  const selectedPaths = selectedFields
    .map((field) => (field.fieldName ?? '').trim())
    .filter(Boolean);
  const contentKeys = content.length
    ? collectReportContentColumnKeys(content)
    : selectedPaths;
  // Порядок как в selectedFields: content-ключ часто = alias (rename/дубль).
  const orderedKeys = orderReportContentColumnKeys(contentKeys, selectedFields);
  const { displayColumnKeys } = planReportCompositeResultColumns(orderedKeys, selectedPaths);
  return displayColumnKeys.slice(0, limit);
}

/**
 * Object.keys(columnHeaderLabels) → headerOrder в полном отчёте.
 *
 * Alias-only ключи режутся в mapReportContent (#42). Для клона N-го вхождения
 * path нужен compose-ключ «field#N» на месте selectedFields — иначе при повторном
 * «открыть полный отчёт» с дашборда клон уезжает в конец (hints без #N / alias).
 * Только порядок/наличие ключей; подписи значений не меняем по смыслу.
 */
function orderLabelsBySelectedFields(
  labels: Record<string, string>,
  selectedFields: ReportSelectedFieldPayload[],
): Record<string, string> {
  const ordered: Record<string, string> = {};
  const used = new Set<string>();
  const occurrenceByPath = new Map<string, number>();

  for (const field of selectedFields) {
    const fieldName = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    const occurrence = fieldName ? (occurrenceByPath.get(fieldName) ?? 0) + 1 : 0;
    if (fieldName) occurrenceByPath.set(fieldName, occurrence);

    const composeDupKey =
      fieldName && occurrence > 1 ? buildDuplicateColumnKey(fieldName, occurrence) : '';
    // 2-е+ вхождение: сначала «field#N» (hint, не alias), затем alias/path.
    const candidates =
      occurrence > 1 ? [composeDupKey, alias, fieldName] : [fieldName, alias];

    for (const key of candidates) {
      if (!key || used.has(key)) continue;
      const value = (labels[key] ?? '').trim();
      if (!value) continue;
      ordered[key] = labels[key];
      used.add(key);
    }

    // После loadList снимка с «#N» нет — синтезируем ключ для headerHints.
    if (composeDupKey && !used.has(composeDupKey)) {
      const fromAlias = alias ? (labels[alias] ?? '').trim() : '';
      const fromPath = fieldName ? (labels[fieldName] ?? '').trim() : '';
      const text = fromAlias || fromPath || alias || fieldName;
      if (text) {
        ordered[composeDupKey] = fromAlias || fromPath || text;
        used.add(composeDupKey);
      }
    }
  }

  for (const [key, value] of Object.entries(labels)) {
    if (used.has(key)) continue;
    ordered[key] = value;
    used.add(key);
  }

  return ordered;
}

/**
 * Подписи колонок на дашборде / при «открыть полный отчёт».
 * Снимок UI / alias — как назвал пользователь (без дописывания «Сущность ->»).
 * Остальные колонки — полные подписи metadata, как в «Текущий состав».
 */
export async function resolveOpenReportColumnHeaderLabels(
  entityName: string,
  body: ReportQueryRequest,
  existing?: Record<string, string> | null,
): Promise<Record<string, string>> {
  const selectedFields = body.selectedFields ?? [];
  const selectedPaths = selectedFields
    .map((field) => (field.fieldName ?? '').trim())
    .filter(Boolean);

  const labels: Record<string, string> = {};

  // 1) Снимок с формирования отчёта / карандаша — как в «Текущий состав таблицы».
  for (const [key, value] of Object.entries(existing ?? {})) {
    const trimmed = (value ?? '').trim();
    if (trimmed) labels[key] = trimmed;
  }

  const pathOccurrenceTotal = new Map<string, number>();
  for (const field of selectedFields) {
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    pathOccurrenceTotal.set(path, (pathOccurrenceTotal.get(path) ?? 0) + 1);
  }

  // 2) Alias из definition — только если ключа ещё нет в снимке.
  // Не затираем полные «Сущность -> …_1» decode(alias)=листом; path при клонах не трогаем.
  for (const field of selectedFields) {
    const path = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    if (!path || !alias) continue;
    const fromAlias = decodeReportFieldAliasForUi(alias).trim();
    if (!fromAlias) continue;
    if (!(labels[alias] ?? '').trim()) {
      labels[alias] = fromAlias;
    }
    if (
      (pathOccurrenceTotal.get(path) ?? 0) <= 1 &&
      !(labels[path] ?? '').trim()
    ) {
      labels[path] = fromAlias;
    }
  }

  // 3) Остальное — полный маппинг metadata (без обрезки до листа).
  const resolved = await resolveWidgetColumnHeaderLabels(entityName, body, selectedPaths);
  for (const [key, value] of Object.entries(resolved)) {
    if (labels[key]?.trim()) continue;
    const trimmed = (value ?? '').trim();
    if (trimmed) labels[key] = trimmed;
  }

  // 3b) Системный клон: alias на бэке = «лист_N» → UI «Сущность -> лист_N»
  // (как restoreReportComposeTableFields), не оставлять голый «Результат_1».
  const occurrenceByPath = new Map<string, number>();
  for (const field of selectedFields) {
    const path = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    if (!path) continue;
    const occurrence = (occurrenceByPath.get(path) ?? 0) + 1;
    occurrenceByPath.set(path, occurrence);
    if (occurrence <= 1 || !alias) continue;

    const baseFull = (labels[path] ?? '').trim();
    if (!baseFull || !isReportTableFieldLabelAutoQualified(baseFull)) continue;
    const baseLeaf = extractReportTableFieldLabelLeaf(baseFull) || baseFull;
    const systemEncoded = `${baseLeaf.replace(/\s+/g, '_')}_${occurrence - 1}`;
    if (alias !== systemEncoded) continue;

    const fullCloneLabel = `${baseFull}_${occurrence - 1}`;
    labels[alias] = fullCloneLabel;
    const dupKey = buildDuplicateColumnKey(path, occurrence);
    if (!(labels[dupKey] ?? '').trim()) {
      labels[dupKey] = fullCloneLabel;
    }
  }

  // 4) Порядок ключей = selectedFields (+ «field#N» для клонов) — openFullReport.
  return orderLabelsBySelectedFields(labels, selectedFields);
}
