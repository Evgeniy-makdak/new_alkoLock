import { stripDuplicateColumnSuffix } from './reportColumnDuplicate';

/**
 * Подсказка порядка колонки: в content ключ часто = alias (переименование / дубль),
 * а не fieldName — иначе колонка уезжает в конец.
 */
export type ReportColumnOrderPreference = {
  fieldName?: string | null;
  alias?: string | null;
};

/** Порядок колонок: сначала selectedFields (alias или fieldName), затем остальные из content. */
export function orderReportContentColumnKeys(
  contentKeys: string[],
  preferredOrder: Array<string | ReportColumnOrderPreference> | undefined,
): string[] {
  if (!preferredOrder?.length) {
    return contentKeys;
  }
  const contentSet = new Set(contentKeys);
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const item of preferredOrder) {
    const candidates =
      typeof item === 'string'
        ? [item.trim()].filter(Boolean)
        : [(item.alias ?? '').trim(), (item.fieldName ?? '').trim()].filter(Boolean);
    for (const name of candidates) {
      if (!contentSet.has(name) || seen.has(name)) continue;
      ordered.push(name);
      seen.add(name);
      break;
    }
  }

  for (const key of contentKeys) {
    if (!seen.has(key)) {
      ordered.push(key);
      seen.add(key);
    }
  }

  return ordered;
}

/**
 * Порядок колонок по ключам снимка заголовков («Текущий состав»).
 *
 * Важно: hint `fieldName` часто есть в content как ключ ОРИГИНАЛА. Нельзя делать
 * `if (keySet.has(hint)) ordered.push(hint)` — при клоне выше оригинала это
 * пушит оригинал и одновременно снимает клон из remaining (#42).
 * Всегда сначала резолвим через selectedFields по порядку вхождения.
 */
export function orderColumnKeysByHeaderHints(
  columnKeys: string[],
  headerHints: string[],
  preferredOrder: Array<string | ReportColumnOrderPreference> | undefined,
): string[] {
  if (!headerHints.length) return columnKeys;
  const keySet = new Set(columnKeys);
  const remaining = (preferredOrder ?? []).filter(
    (item): item is ReportColumnOrderPreference => typeof item !== 'string',
  );

  const takeContentKey = (field: ReportColumnOrderPreference, seen: Set<string>): string | null => {
    const alias = (field.alias ?? '').trim();
    const fieldName = (field.fieldName ?? '').trim();
    if (alias && keySet.has(alias) && !seen.has(alias)) return alias;
    if (fieldName && keySet.has(fieldName) && !seen.has(fieldName)) return fieldName;
    return null;
  };

  const pickRemainingIndex = (hint: string): number => {
    const base = stripDuplicateColumnSuffix(hint);
    const exactAlias = remaining.findIndex(
      (field) => (field.alias ?? '').trim() === hint,
    );
    if (exactAlias >= 0) return exactAlias;

    return remaining.findIndex((field) => {
      const fieldName = (field.fieldName ?? '').trim();
      const alias = (field.alias ?? '').trim();
      return fieldName === base || fieldName === hint || alias === base;
    });
  };

  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const hint of headerHints) {
    const idx = pickRemainingIndex(hint);
    if (idx >= 0) {
      const [field] = remaining.splice(idx, 1);
      if (!field) continue;
      const resolved = takeContentKey(field, seen);
      if (!resolved) continue;
      ordered.push(resolved);
      seen.add(resolved);
      continue;
    }

    // Составные / ключи вне selectedFields — только прямое совпадение с content.
    if (keySet.has(hint) && !seen.has(hint)) {
      ordered.push(hint);
      seen.add(hint);
    }
  }

  for (const key of columnKeys) {
    if (seen.has(key)) continue;
    ordered.push(key);
    seen.add(key);
  }
  return ordered;
}
