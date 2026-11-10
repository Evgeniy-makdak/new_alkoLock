/**
 * Сравнение параметров отчёта (definition) для поиска уже сохранённого отчёта.
 * Бэк дополняет definition служебными полями (entityName, pageableDto, флаги колонок
 * filterable/sortable/… = false), поэтому перед сравнением они отбрасываются.
 */

const COLUMN_FLAG_KEYS = new Set([
  'filterable',
  'sortable',
  'groupable',
  'selectable',
  'defaultSelected',
]);
const ROOT_IGNORED_KEYS = new Set(['pageableDto', 'entityName']);

function normalize(value: unknown, isRoot: boolean): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => normalize(item, false));
    return items.length ? items : undefined;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (isRoot && ROOT_IGNORED_KEYS.has(key)) continue;
      const raw = (value as Record<string, unknown>)[key];
      if (raw === undefined || raw === null) continue;
      if (COLUMN_FLAG_KEYS.has(key) && raw === false) continue;
      const normalized = normalize(raw, false);
      if (normalized === undefined) continue;
      result[key] = normalized;
    }
    return Object.keys(result).length ? result : undefined;
  }
  return value;
}

export function isSameReportDefinition(a: unknown, b: unknown): boolean {
  if (!a || !b) return false;
  return JSON.stringify(normalize(a, true) ?? null) === JSON.stringify(normalize(b, true) ?? null);
}
