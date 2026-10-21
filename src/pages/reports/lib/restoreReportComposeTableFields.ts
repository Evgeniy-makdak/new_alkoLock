import type { Values } from '@shared/ui/search_multiple_select';

import {
  isReportTableFieldLabelAutoQualified,
  QUALIFIED_LABEL_SEPARATOR,
  ROOT_ENTITY_LABEL_SEPARATOR,
} from './buildReportTableFieldOptions';
import { decodeReportFieldAliasForUi } from './reportSelectedFieldAliases';
import { buildDuplicateColumnKey } from './reportColumnDuplicate';
import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

/**
 * Если в alias только изменённый лист («Тип тип тип»), а дефолт был
 * «Отчет по ТС -> Тип» — собираем полный вид для «Текущего состава».
 */
function mergeAliasLeafIntoQualifiedOptionLabel(
  aliasUiLabel: string,
  optionLabel: string,
): string {
  const alias = aliasUiLabel.trim();
  const option = optionLabel.trim();
  if (!alias || !option) return alias || option;
  if (isReportTableFieldLabelAutoQualified(alias)) return alias;
  if (!isReportTableFieldLabelAutoQualified(option)) return alias;
  const sep = option.includes(ROOT_ENTITY_LABEL_SEPARATOR)
    ? ROOT_ENTITY_LABEL_SEPARATOR
    : QUALIFIED_LABEL_SEPARATOR;
  const idx = option.lastIndexOf(sep);
  if (idx < 0) return alias;
  return `${option.slice(0, idx)}${sep}${alias}`;
}

/**
 * «Текущий состав» при редактировании сформированного отчёта —
 * из body.selectedFields, подписи из columnHeaderLabels / optionLabels.
 */
export function restoreReportComposeTableFieldsFromQuery(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
  columnHeaderLabels: Record<string, string> | undefined = {},
  optionLabelByPath: Record<string, string> = {},
): Values {
  const result: Values = [];
  // Дубли колонок («latitude», «latitude#2», …) сохраняются при редактировании отчёта.
  const seen = new Map<string, number>();

  for (const field of selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    const occurrence = (seen.get(path) ?? 0) + 1;
    seen.set(path, occurrence);
    const key = occurrence === 1 ? path : buildDuplicateColumnKey(path, occurrence);

    // Полная UI-подпись с карандаша (в т.ч. «Сущность -> …») важнее сырого alias-листа.
    const fromHeaders = (columnHeaderLabels[path] ?? '').trim();
    if (fromHeaders) {
      result.push({ value: key, label: fromHeaders });
      continue;
    }

    const fromAlias = (field.alias ?? '').trim()
      ? decodeReportFieldAliasForUi(String(field.alias))
      : '';
    const fromOption = (optionLabelByPath[path] ?? '').trim();
    const label =
      (fromAlias && fromOption
        ? mergeAliasLeafIntoQualifiedOptionLabel(fromAlias, fromOption)
        : '') ||
      fromAlias ||
      fromOption ||
      path;
    result.push({ value: key, label });
  }

  return result;
}

/** Подпись колонки для UI группировки/сортировки. */
export function resolveComposeColumnDisplayLabel(
  columnKey: string,
  columnOptions: Values,
  columnHeaderLabels: Record<string, string> | undefined = {},
): string {
  const key = columnKey.trim();
  if (!key) return '';
  // Сначала сохранённые заголовки (карандаш) — options могли уже сброситься к дефолту.
  const fromHeaders = (columnHeaderLabels[key] ?? '').trim();
  if (fromHeaders) return fromHeaders;
  const fromOptions = columnOptions.find((o) => String(o.value) === key);
  if (fromOptions?.label != null && String(fromOptions.label).trim()) {
    return String(fromOptions.label).trim();
  }
  return key;
}
