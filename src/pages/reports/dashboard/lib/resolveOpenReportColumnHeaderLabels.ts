import {
  collectReportContentColumnKeys,
  orderReportContentColumnKeys,
} from '../../lib/buildReportTableFieldOptions';
import { planReportCompositeResultColumns } from '../../lib/reportEntityCompositeFields';
import { decodeReportFieldAliasForUi } from '../../lib/reportSelectedFieldAliases';
import type { ReportQueryRequest } from '../../types/reportApiTypes';
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
 * Подписи колонок на дашборде / при «открыть полный отчёт».
 * Снимок UI / alias — как назвал пользователь (без дописывания «Сущность ->»).
 * Остальные колонки — полные подписи metadata, как в «Текущий состав».
 */
export async function resolveOpenReportColumnHeaderLabels(
  entityName: string,
  body: ReportQueryRequest,
  existing?: Record<string, string> | null,
): Promise<Record<string, string>> {
  const selectedPaths = (body.selectedFields ?? [])
    .map((field) => (field.fieldName ?? '').trim())
    .filter(Boolean);

  const labels: Record<string, string> = {};

  // 1) Снимок с формирования отчёта / карандаша — как в «Текущий состав таблицы».
  for (const [key, value] of Object.entries(existing ?? {})) {
    const trimmed = (value ?? '').trim();
    if (trimmed) labels[key] = trimmed;
  }

  // 2) Alias из definition — как есть (без «Сущность ->»), если снимка ещё нет.
  for (const field of body.selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    if (!path || !alias) continue;
    const fromAlias = decodeReportFieldAliasForUi(alias).trim();
    if (!fromAlias) continue;
    if (!labels[path]?.trim()) labels[path] = fromAlias;
    // Ключ ответа = alias: всегда сама подпись alias, не склеенная с path/metadata.
    if (!labels[alias]?.trim()) labels[alias] = fromAlias;
  }

  // 3) Остальное — полный маппинг metadata (без обрезки до листа).
  const resolved = await resolveWidgetColumnHeaderLabels(entityName, body, selectedPaths);
  for (const [key, value] of Object.entries(resolved)) {
    if (labels[key]?.trim()) continue;
    const trimmed = (value ?? '').trim();
    if (trimmed) labels[key] = trimmed;
  }

  return labels;
}
