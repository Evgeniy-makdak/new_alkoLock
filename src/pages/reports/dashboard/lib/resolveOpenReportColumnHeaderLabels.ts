import {
  collectReportContentColumnKeys,
  orderReportContentColumnKeys,
} from '../../lib/buildReportTableFieldOptions';
import { planReportCompositeResultColumns } from '../../lib/reportEntityCompositeFields';
import {
  decodeReportFieldAliasForUi,
  extractReportTableFieldLabelLeaf,
} from '../../lib/reportSelectedFieldAliases';
import type { ReportQueryRequest } from '../../types/reportApiTypes';
import { resolveWidgetColumnHeaderLabels } from './resolveWidgetColumnHeaderLabels';

/** Порядок колонок как на вкладке «Отчёты» (selectedFields + composite). */
export function orderWidgetPreviewColumns(
  content: Array<Record<string, unknown>>,
  body: ReportQueryRequest | undefined,
  limit = 8,
): string[] {
  const selectedPaths = (body?.selectedFields ?? [])
    .map((field) => (field.fieldName ?? '').trim())
    .filter(Boolean);
  const contentKeys = content.length
    ? collectReportContentColumnKeys(content)
    : selectedPaths;
  const orderedKeys = orderReportContentColumnKeys(contentKeys, selectedPaths);
  const { displayColumnKeys } = planReportCompositeResultColumns(orderedKeys, selectedPaths);
  return displayColumnKeys.slice(0, limit);
}

/**
 * Подписи колонок отчёта на дашборде / при открытии полного отчёта.
 * Приоритет: переданные UI-подписи → alias из definition → metadata без «Сущность -> ».
 * Так сохраняются пользовательские переименования после привязки к дашборду (#10).
 */
export async function resolveOpenReportColumnHeaderLabels(
  entityName: string,
  body: ReportQueryRequest,
  existing?: Record<string, string> | null,
): Promise<Record<string, string>> {
  const selectedPaths = (body.selectedFields ?? [])
    .map((field) => (field.fieldName ?? '').trim())
    .filter(Boolean);

  // Снимок с вкладки «Отчёты» / карандаша — как есть (в т.ч. произвольное «Мой АЗ»).
  const labels: Record<string, string> = {};
  for (const [key, value] of Object.entries(existing ?? {})) {
    const trimmed = (value ?? '').trim();
    if (trimmed) labels[key] = trimmed;
  }

  // Alias из сохранённого definition — переживает перечитывание дашборда с бэка.
  for (const field of body.selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    if (!path || !alias) continue;
    const fromAlias = decodeReportFieldAliasForUi(alias).trim();
    if (!fromAlias) continue;
    labels[path] = fromAlias;
    labels[alias] = fromAlias;
  }

  // Остальное — из metadata, но без автопрефикса «Сущность -> ».
  const resolved = await resolveWidgetColumnHeaderLabels(entityName, body, selectedPaths);
  for (const [key, value] of Object.entries(resolved)) {
    if (labels[key]?.trim()) continue;
    const leaf = extractReportTableFieldLabelLeaf(value) || value;
    if (leaf.trim()) labels[key] = leaf.trim();
  }

  return labels;
}
