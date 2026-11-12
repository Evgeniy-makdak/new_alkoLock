import type { Values } from '@shared/ui/search_multiple_select';

import {
  decodeReportFieldAliasForUi,
  extractReportTableFieldLabelLeaf,
} from './reportSelectedFieldAliases';
import { buildDuplicateColumnKey } from './reportColumnDuplicate';
import type { ReportSelectedFieldPayload } from '../types/reportApiTypes';

/**
 * «Текущий состав» при редактировании сформированного отчёта —
 * из body.selectedFields, подписи из columnHeaderLabels / optionLabels.
 * Системный клон («…_1») сохраняет «Сущность -> Поле_1»;
 * ручной alias (пользователь стёр и написал своё) — как есть, без префикса.
 */
export function restoreReportComposeTableFieldsFromQuery(
  selectedFields: ReportSelectedFieldPayload[] | undefined,
  columnHeaderLabels: Record<string, string> | undefined = {},
  optionLabelByPath: Record<string, string> = {},
): Values {
  const result: Values = [];
  // Дубли колонок («latitude», «latitude#2», …) сохраняются при редактировании отчёта.
  const seen = new Map<string, number>();
  // Имя ИСХОДНОЙ строки базового поля — от неё строится системное имя клона («…_1»).
  const baseLabelByPath = new Map<string, string>();

  for (const field of selectedFields ?? []) {
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    const occurrence = (seen.get(path) ?? 0) + 1;
    seen.set(path, occurrence);
    const key = occurrence === 1 ? path : buildDuplicateColumnKey(path, occurrence);

    const rawAlias = (field.alias ?? '').trim();
    const fromAlias = rawAlias ? decodeReportFieldAliasForUi(rawAlias).trim() : '';

    if (occurrence === 1) {
      // Снимок с карандаша / alias → path; ручной alias без снимка — как есть.
      const fromHeaders =
        (columnHeaderLabels[path] ?? '').trim() ||
        (rawAlias ? (columnHeaderLabels[rawAlias] ?? '').trim() : '');
      if (fromHeaders) {
        baseLabelByPath.set(path, fromHeaders);
        result.push({ value: key, label: fromHeaders });
        continue;
      }
      const fromOption = (optionLabelByPath[path] ?? '').trim();
      const label = fromAlias || fromOption || path;
      baseLabelByPath.set(path, label);
      result.push({ value: key, label });
      continue;
    }

    // Клон («field#N»): системное имя = имя исходной строки + «_N» (с подчёркиванием!).
    const baseLabel = baseLabelByPath.get(path) ?? '';
    const fromHeaders =
      (columnHeaderLabels[key] ?? '').trim() ||
      (rawAlias ? (columnHeaderLabels[rawAlias] ?? '').trim() : '');
    if (fromHeaders) {
      result.push({ value: key, label: fromHeaders });
      continue;
    }
    // Алиас на бэке хранит только «лист» подписи и кодируется «_» вместо пробелов
    // («Время_события_1»). Системный алиас клона = encode(лист базовой подписи) + «_N».
    const baseLeaf = extractReportTableFieldLabelLeaf(baseLabel) || baseLabel;
    const systemEncodedAlias = baseLeaf
      ? `${baseLeaf.replace(/\s+/g, '_')}_${occurrence - 1}`
      : '';
    const isSystemSuffix =
      Boolean(rawAlias) && Boolean(systemEncodedAlias) && rawAlias === systemEncodedAlias;
    // Системный клон — полная «Сущность -> Поле_N»; ручной alias — как назвал пользователь.
    const label = isSystemSuffix
      ? `${baseLabel}_${occurrence - 1}`
      : fromAlias
        ? fromAlias
        : baseLabel
          ? `${baseLabel}_${occurrence - 1}`
          : key;
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
