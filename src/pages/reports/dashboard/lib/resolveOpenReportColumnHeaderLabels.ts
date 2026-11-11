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
 * Подписи колонок на дашборде / при «открыть полный отчёт».
 * Как в «Текущий состав таблицы» и гриде «Отчёты»: полные «Сущность -> поле»,
 * плюс пользовательские переименования из alias (definition) / снимка UI.
 * Обрезку до листа не делаем — она ломала корректные составные подписи.
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

  // 2) Alias из definition — только если снимка ещё нет (после перечитывания дашборда с бэка).
  // Снимок «Текущий состав» не затираем: там уже полные «Сущность -> поле» и ручные имена.
  for (const field of body.selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    const alias = (field.alias ?? '').trim();
    if (!path || !alias) continue;
    const fromAlias = decodeReportFieldAliasForUi(alias).trim();
    if (!fromAlias) continue;
    if (!labels[path]?.trim()) labels[path] = fromAlias;
    if (!labels[alias]?.trim()) labels[alias] = labels[path] || fromAlias;
  }

  // 3) Остальное — полный маппинг как у грида / «Текущий состав» (без обрезки до листа).
  const resolved = await resolveWidgetColumnHeaderLabels(entityName, body, selectedPaths);
  for (const [key, value] of Object.entries(resolved)) {
    if (labels[key]?.trim()) continue;
    const trimmed = (value ?? '').trim();
    if (trimmed) labels[key] = trimmed;
  }

  return labels;
}
