import type { Values } from '@shared/ui/search_multiple_select';

import {
  decodeReportFieldAliasForUi,
  extractReportTableFieldLabelLeaf,
} from './reportSelectedFieldAliases';
import {
  buildDuplicateColumnKey,
  isDuplicateColumnKey,
  stripDuplicateColumnSuffix,
} from './reportColumnDuplicate';
import {
  expandCompositeFieldPath,
  isReportCompositeFieldPath,
} from './reportEntityCompositeFields';
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
  const fields = selectedFields ?? [];
  // Дубли колонок («latitude», «latitude#2», …) сохраняются при редактировании отчёта.
  const seen = new Map<string, number>();
  const totalByPath = new Map<string, number>();
  for (const field of fields) {
    const path = (field.fieldName ?? '').trim();
    if (path) totalByPath.set(path, (totalByPath.get(path) ?? 0) + 1);
  }

  const compositeAtIndex = new Map<number, { key: string; label: string; memberCount: number }>();
  const usedCompositeIndexes = new Set<number>();
  for (const [key, rawLabel] of Object.entries(columnHeaderLabels)) {
    const label = (rawLabel ?? '').trim();
    if (!isReportCompositeFieldPath(key) || !label) continue;
    const members = expandCompositeFieldPath(key);
    if (members.length < 2 || members.some(isReportCompositeFieldPath)) continue;

    for (let start = 0; start <= fields.length - members.length; start += 1) {
      const matches = members.every(
        (member, offset) =>
          !usedCompositeIndexes.has(start + offset) &&
          (fields[start + offset]?.fieldName ?? '').trim() === member,
      );
      if (!matches) continue;

      compositeAtIndex.set(start, { key, label, memberCount: members.length });
      for (let offset = 0; offset < members.length; offset += 1) {
        usedCompositeIndexes.add(start + offset);
      }
      break;
    }
  }

  const composeKeysByPath = new Map<string, string[]>();
  for (const key of Object.keys(columnHeaderLabels)) {
    const path = stripDuplicateColumnSuffix(key);
    if (!path || (key !== path && !isDuplicateColumnKey(key))) continue;
    if (!totalByPath.has(path)) continue;
    const keys = composeKeysByPath.get(path) ?? [];
    keys.push(key);
    composeKeysByPath.set(path, keys);
  }
  // Имя ИСХОДНОЙ строки базового поля — от неё строится системное имя клона («…_1»).
  const baseLabelByPath = new Map<string, string>();

  for (let index = 0; index < fields.length; index += 1) {
    const composite = compositeAtIndex.get(index);
    if (composite) {
      result.push({ value: composite.key, label: composite.label });
      index += composite.memberCount - 1;
      continue;
    }

    const field = fields[index];
    const path = (field.fieldName ?? '').trim();
    if (!path) continue;
    const occurrence = (seen.get(path) ?? 0) + 1;
    seen.set(path, occurrence);
    const composeKeys = composeKeysByPath.get(path);
    const key =
      composeKeys && composeKeys.length === totalByPath.get(path)
        ? composeKeys[occurrence - 1]!
        : occurrence === 1
          ? path
          : buildDuplicateColumnKey(path, occurrence);

    const rawAlias = (field.alias ?? '').trim();
    const fromAlias = rawAlias ? decodeReportFieldAliasForUi(rawAlias).trim() : '';

    if (occurrence === 1) {
      // Снимок с карандаша / alias → path; ручной alias без снимка — как есть.
      const fromHeaders =
        (columnHeaderLabels[key] ?? '').trim() ||
        (columnHeaderLabels[path] ?? '').trim() ||
        (rawAlias ? (columnHeaderLabels[rawAlias] ?? '').trim() : '');
      if (fromHeaders) {
        baseLabelByPath.set(
          path,
          (columnHeaderLabels[path] ?? '').trim() ||
            (optionLabelByPath[path] ?? '').trim() ||
            fromHeaders,
        );
        result.push({ value: key, label: fromHeaders });
        continue;
      }
      const fromOption = (optionLabelByPath[path] ?? '').trim();
      const label = fromAlias || fromOption || path;
      baseLabelByPath.set(path, (columnHeaderLabels[path] ?? '').trim() || fromOption || label);
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
